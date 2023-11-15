/**
 * Samuel Moon >> AJ Voisan >> Branden Zamora
 * 
 * Notes (update 12/23/19):
 * 1. Environment variables are set on the lambda configuration page.
 *    API Gateway URL set on process.env.APIGATEWAY
 * 2. Timeout is set at 15 minutes. Storing JSON outside handler or in
 *    the /tmp/ directory is unreliable, as they are reliant on Lambda's
 *    execution context.
 * 3. Execution context is garbage collected on videos that take a long
 *    time to process. Will need to use S3 to store fileContext JSON.
 */

'use strict';
const BoxSDK = require("box-node-sdk");
const { FilesReader, SkillsWriter, SkillsErrorEnum } = require("./skills-kit-library/skills-kit-2.0.js");
const {VideoIndexer, ConvertTime} = require("./video-indexer");
const { Upload } = require("@aws-sdk/lib-storage"),
      { S3, S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { request } = require("express");
const TranscribeDoc = require("./transcribe-doc").TranscribeDoc;

var s3 = new S3();
const client = new S3Client({});
// const cloneDeep = require("lodash/cloneDeep"); // For deep cloning json objects

module.exports.handler = async (event) => {
    
    // VideoIndexer event
    if (event && event.queryStringParameters && event.queryStringParameters.state === "Processed") {
        
        console.debug(`VideoIndexer finished processing event received: ${JSON.stringify(event)}`);

        try {
            const videoId = event.queryStringParameters.id;
            const requestId = event.queryStringParameters.requestId;

            let videoIndexer = new VideoIndexer(process.env.APIGATEWAY); // Initialized with callback endpoint
            await videoIndexer.getToken(false);

            let params = {
                Bucket: process.env.S3_BUCKET,
                Key: requestId
            }

            console.log('Request ID: ' + requestId);

            // let bucketData = await s3.getObject(params).promise();
            // console.log(bucketData);

            const command = new GetObjectCommand(params);
            const bucketData = await client.send(command);
            const response = await bucketData.Body.transformToString();

            console.log(response);

            // "Body" is capital "B", not lowercase like "body".
            let fileContext = JSON.parse(response);
            console.log(fileContext);
            console.log('FileWriteToken: ' + fileContext.fileWriteToken);

            // retrieve folderId from fileContext
            let folderId = fileContext.folderId;
            console.log("folderId after VI finished: ", folderId);

            let skillsWriter = new SkillsWriter(fileContext);

            const indexerData = await videoIndexer.getData(videoId); // Can create skill cards after data extraction
                                                                    // This method also stores videoId for future use.

            const cards = [];

            let fileDuration = indexerData.summarizedInsights.duration.seconds;
            console.log("FileDuration: " + fileDuration);

            // Keywords
            let keywords = [];
            indexerData.summarizedInsights.keywords.forEach(kw => {
                if (kw.name.trim()) {
                    keywords.push({
                        text: kw.name,
                        appears: kw.appearances.map(time => {
                            return {start: time.startSeconds, end: time.endSeconds}; // AJ Voisan: need to use appearnaces and startSeconds(not in VI docs)
                        })
                    })
                }
            });
            console.log(keywords);
            cards.push(skillsWriter.createTopicsCard(keywords, fileDuration));

            // Transcripts (sometimes text is empty string such as "")
            let transcripts = [];
            indexerData.videos[0].insights.transcript.forEach(tr => {
                // Check if empty or whitespace
                if (tr.text.trim()) {
                    transcripts.push({
                        text: tr.text,
                        appears: tr.instances.map(time => {
                            return {start: ConvertTime(time.start), end: ConvertTime(time.end)};
                        })
                    })
                }
            })
            console.log(transcripts);
            cards.push(skillsWriter.createTranscriptsCard(transcripts, fileDuration));


            // Faces (sometimes there are no faces detected)
            if (indexerData.videos[0].insights.faces) {
                let faces = [];
                indexerData.videos[0].insights.faces.forEach(fa => {
                    faces.push({
                        text: fa.name,
                        image_url: videoIndexer.getFace(fa.thumbnailId),
                        appears: fa.instances.map(time => {
                            return {start: ConvertTime(time.start), end: ConvertTime(time.end)};
                        })
                    })
                });
                console.log(faces);
                cards.push(await skillsWriter.createFacesCard(faces, fileDuration));
            }

            // New TranscribeDoc section
            console.debug('Calling transcribeDoc');
            console.debug(TranscribeDoc);

            await TranscribeDoc(indexerData, fileContext.fileName, folderId);

            console.log("After TranscribeDocBefore saveDataCards");
            await skillsWriter.saveDataCards(cards);
            console.log("After saveDataCards");
            // This was where transcribe-doc call was originally placed

            // delete the newly created S3 bucket object
            const deleteS3Object = new DeleteObjectCommand(params);
            const deleteS3ObjectResponse = await client.send(deleteS3Object);
            console.log(deleteS3ObjectResponse);
            console.log('S3 Bucket Deletion Success.');

        } catch(e) {
            console.error(e);
        }
        return;
    }

    let parsedBody = JSON.parse(event.body);
    console.log(parsedBody);

    if (event && parsedBody.hasOwnProperty("type") && parsedBody.type === "skill_invocation") {
            console.debug(`Box event received: ${JSON.stringify(event)}`);

        try {
            // check if request is valid
            let isValid = BoxSDK.validateWebhookMessage(event.body, event.headers, process.env.BOX_PRIMARY_KEY, process.env.BOX_SECONDARY_KEY);
            
            if (isValid) {

                let videoIndexer = new VideoIndexer(process.env.APIGATEWAY); // Initialized with callback endpoint
                let VItoken = await videoIndexer.getToken(true);

                if (VItoken.statusCode != 200) { // Handling VI initializing Errors
                    console.error('Failed to Create a Video Indexer Object');
                    return {statusCode: 400, body: "Check Error Log."};
                }
                    
                // instantiate your two skill development helper tools
                let filesReader = new FilesReader(event.body);
                let fileContext = filesReader.getFileContext();
        
                // attempt to get folderID from source where file was uploaded
                let sourceFolderID = parsedBody.source.parent.id;
                console.log("sourceFolderID: ", sourceFolderID);
        
                // create new sourceFolderID for fileContext
                fileContext.folderId = sourceFolderID;
            
                    // S3 write fileContext JSON to save tokens for later use.
                    let params = {
                        Bucket: process.env.S3_BUCKET,
                        Key: fileContext.requestId,
                        Body: JSON.stringify(fileContext)
                    }
        
                    console.log('Request ID: ' + fileContext.requestId);

                    // create a new S3 bucket to work with
                    const s3Response = await client.send(new PutObjectCommand( params ));
                    console.log(s3Response);
                    console.debug('S3 Bucket Creation Success.');
            
                    let skillsWriter = new SkillsWriter(fileContext);
                    
                    await skillsWriter.saveProcessingCard();
                
                    console.debug("sending video to VI");
                    await videoIndexer.upload(fileContext.fileName, fileContext.requestId, fileContext.fileDownloadURL,JSON.parse(event.body).skill.name); // Will POST a success when it's done indexing.
                    console.debug("video sent to VI");
            
                    console.debug("returning response to box");
                    return {statusCode: 200, body: "Event Received and Sent to VI"};

            } else {
                console.error('Security Keys Were Not Valid.');
                return {statusCode: 401, body: "Invalid Security Keys"};
            }

        } catch(e) {
            console.error(e);

            // In the case that an error occurs, return an error message to Box
            let filesReader = new FilesReader(event.body);
            let fileContext = filesReader.getFileContext();
            let skillsWriter = new SkillsWriter(fileContext);

            await skillsWriter.saveErrorCard(); // this displays the error message to the user
            
            return {statusCode: 400};
        }
            
    }

    else {
        console.debug("Unknown request");
        console.log(event);

        return {statusCode: 400, body: "Unknown Request"};
    }
};