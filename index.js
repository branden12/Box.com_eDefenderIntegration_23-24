'use strict';
const { FilesReader, SkillsWriter, SkillsErrorEnum } = require('./skills-kit-library/skills-kit-2.0.js');
const {VideoIndexer, ConvertTime} = require('./video-indexer.js');
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const {TranscribeDoc} = require('./transcribe-doc.js');

const s3Client = new S3Client({ region: "us-east-1" }); // or your AWS region

module.exports.handler = async (event) => {
    console.log("Start function");
    async function getS3Object(bucketName, objectKey) {
        const getObjectParams = {
            Bucket: bucketName,
            Key: objectKey,
        };
        try {
            const command = new GetObjectCommand(getObjectParams);
            const data = await s3Client.send(command);
            // Note: For reading the object's data, especially if it's a stream, handle accordingly
            return data;
        } catch (error) {
            console.error("Error in getObject:", error);
            throw error;
        }
    }
    
    async function uploadToS3(bucketName, objectKey, body) {
        const uploadParams = {
            Bucket: bucketName,
            Key: objectKey,
            Body: body, // this can be a Buffer, Typed Array, Blob, String, ReadableStream
        };
        try {
            const command = new PutObjectCommand(uploadParams);
            const data = await s3Client.send(command);
            return data; // Contains the response from S3
        } catch (error) {
            console.error("Error in upload:", error);
            throw error;
        }
    }
    
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

            let bucketData = await getS3Object(process.env.S3_BUCKET, requestId);
            console.log(bucketData);

            // "Body" is capital "B", not lowercase like "body".
            console.log('This working??')
            let fileContext = JSON.parse(bucketData.Body.toString());
            console.log(fileContext);
            console.log(fileContext.fileWriteToken);

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

        } catch(e) {
            console.error(e);
            // sendErrorEmail(e);
        }
        return;
    }

    console.log('Begin Parsed Body\n')
    let parsedBody = JSON.parse(event.body);
    console.log('Parsed Body: ', parsedBody);

    if (event && parsedBody.hasOwnProperty("type") && parsedBody.type === "skill_invocation") {
        try {
            console.debug(`Box event received: ${JSON.stringify(event)}`);
            let videoIndexer = new VideoIndexer(process.env.APIGATEWAY); // Initialized with callback endpoint
            await videoIndexer.getToken(true);
            
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

            let s3Response = await uploadToS3(process.env.S3_BUCKET, fileContext.requestId, JSON.stringify(fileContext));
            console.log(s3Response);
    
            let skillsWriter = new SkillsWriter(fileContext);
            
            await skillsWriter.saveProcessingCard();
        
            console.debug("sending video to VI");
            await videoIndexer.upload(fileContext.fileName, fileContext.requestId, fileContext.fileDownloadURL,JSON.parse(event.body).skill.name); // Will POST a success when it's done indexing.
            console.debug("video sent to VI");
    
            console.debug("returning response to box");
            return {statusCode: 200};
        } catch(e) {
            console.error(e);
            // sendErrorEmail(e);
        }
    }
    else {
        console.debug("Unknown request");
        console.log(event);

        return {statusCode: 400, body: "Unknown Request"};
    }
};