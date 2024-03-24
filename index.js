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
            console.log("Data: \n"); //test
            console.log(data) //test
            // Note: For reading the object's data, especially if it's a stream, handle accordingly
            console.log("[SUCCESS] Successfully retrieved data from S3")
            return data;
        } catch (error) {
            console.error("[ERROR] Error in getObject:", error);
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
            console.log("[SUCCESS] Successfully uploaded to S3")
            return data; // Contains the response from S3
        } catch (error) {
            console.error("[ERROR] Error in upload to S3:", error);
            throw error;
        }
    }

    // test helper function to help with VI error
    async function streamToString(stream) {
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', (err) => {
                console.log("[ERROR] Error converting stream to string:", err)
                reject(err)
            });
            stream.on('end', () => {
                console.log("[SUCCESS] Successfully converted Stream to String")
                resolve(Buffer.concat(chunks).toString('utf-8'))
            });
        });
    }
    
    // VideoIndexer event
    if (event && event.queryStringParameters && event.queryStringParameters.state === "Processed") {
        
        console.debug(`[EVENT] VideoIndexer finished processing event received: ${JSON.stringify(event)}`);

        try {
            const videoId = event.queryStringParameters.id;
            const requestId = event.queryStringParameters.requestId;

            let videoIndexer = new VideoIndexer(process.env.APIGATEWAY); // Initialized with callback endpoint
            await videoIndexer.getToken(true);

            console.log("[SUCCESS] Successfully obtained tokens from VideoIndexer")

            let params = {
                Bucket: process.env.S3_BUCKET,
                Key: requestId
            }

            console.log('Request ID: ' + requestId);

            let bucketData = await getS3Object(process.env.S3_BUCKET, requestId);
            console.log(bucketData);

            // "Body" is capital "B", not lowercase like "body".
            console.log('This working??')
            const bodyContents = await streamToString(bucketData.Body);
            let fileContext = JSON.parse(bodyContents);
            console.log("[SUCCESS] Successfully retrieved and parsed file context from S3 In VideoIndexer Event")
            console.log(fileContext);
            console.log(fileContext.fileWriteToken);

            // retrieve folderId from fileContext
            let folderId = fileContext.folderId;
            console.log("folderId after VI finished: ", folderId);

            let skillsWriter = new SkillsWriter(fileContext);

            const indexerData = await videoIndexer.getData(videoId); // Can create skill cards after data extraction
                                                                    // This method also stores videoId for future use.
            console.log("[SUCCESS] Successfully obtained date from VideoIndexer for videoID")
            const cards = [];

            let fileDuration = indexerData.summarizedInsights.duration.seconds;
            console.log("FileDuration: " + fileDuration);

            // Keywords
            //Could Add more logs? need updated code 3/2/2024 - LP
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
            console.error("[ERROR] Error Processing VideoIndexer Event:",e);
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
                //Add the prefix here
                Key: 'Expires/' + fileContext.requestId,
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
            console.log(fileContext.fileDownloadURL);
    
            console.debug("returning response to box");
            console.log("[SUCCESS] Successfully handled Box Skill Invocation")
            return {statusCode: 200};
        } catch(e) {
            console.error("[ERROR] Error handling Box Skill Invocation",e);
            // sendErrorEmail(e);
        }
    }
    else {
        console.debug("[WARN] Unknown request");
        console.log(event);

        return {statusCode: 400, body: "Unknown Request"};
    }
};