'use strict';
const fs = require("fs");
const docx = require("docx");
const { Readable } = require('stream');
const { Buffer } = require("buffer");
const BoxSDK = require("box-node-sdk");
const path = require('path');

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const secret_name = "box-config";
const region = 'us-east-1'
const client = new SecretsManagerClient({region});

const MAX_TRIES = 10; // maximum number of tries for filename duplicates

async function getSecret() {
    try {
        const data = await client.send(new GetSecretValueCommand({ SecretId: secret_name }));
        return JSON.parse(data.SecretString); // Ensure this is correctly capitalized
    } catch (error) {
        console.error("Error retrieving secret:", error);
        throw error; // Rethrow the error to handle it in the calling function
    }
}

async function TranscribeDoc(data, fileName, folderId) {
    let secret;
    try {
        secret = await getSecret();
    } catch (error) {
        console.error("Failed to retrieve secret: ", error);
        throw error;
    }
    
    return new Promise(async (resolve, reject) => {
        const sdk = BoxSDK.getPreconfiguredInstance(secret);
        const appUserClient = sdk.getAppAuthClient('enterprise');
        
        // filename without extension
        let filename = path.parse(fileName).name; 
        console.log("filename without extension: " + filename);

        // Grab folderID from function parameter

        const folderID = folderId;
        console.log("Inside TranscribeDoc - folderID: " + folderID);

        // Parsing the JSON data
        const transcript = data.videos[0].insights.transcript;


        //TRANSCRIPT TEAM CODE START

        // Calculate the original average confidence level
        const totalConfidence = transcript.reduce((sum, tr) => sum + tr.confidence, 0);
        const averageConfidence = totalConfidence / transcript.length;       

        // Find the lowest confidence level
        const lowestConfidence = transcript.reduce((min, tr) => tr.confidence < min ? tr.confidence : min, transcript[0].confidence);

        // Calculate the new average as the average between the computed average and the lowest confidence
        const newAverage = (averageConfidence + lowestConfidence) / 2;

        let count = 0;

        let extraLines = 0;
        let lineLength = 100;

        // Mapping each transcript entry to a TextRun for the Word document
        const textRuns = transcript.map(tr => {

        if (tr.text.trim()) {
            // const text = `Speaker ${tr.speakerId}: \xa0\xa0 ${tr.text}\n`;

            const text = `Speaker ${tr.speakerId}:\xa0\xa0${tr.text} `;
            
            let options;

            if (count == 0) {

                if (text.length > lineLength * 10) {
                    extraLines += 10;

                } else if (text.length > lineLength * 9) {
                    extraLines += 9;

                } else if (text.length > lineLength * 8) {
                    extraLines += 8;

                } else if (text.length > lineLength * 7) {
                    extraLines += 7;

                } else if (text.length > lineLength * 6) {
                    extraLines += 6;

                } else if (text.length > lineLength * 5) {
                    extraLines += 5;
                    
                } else if (text.length > lineLength * 4) {
                    extraLines += 4;

                } else if (text.length > lineLength * 3) {
                    extraLines += 3;

                } else if (text.length > lineLength * 2) {
                    extraLines += 2;

                } else if (text.length > lineLength) {
                    extraLines += 1;

                }

                options = { text: text, size: 24, break: 0 };
                count++;

            } else {

                if (text.length > lineLength * 10) {
                    extraLines += 10;

                } else if (text.length > lineLength * 9) {
                    extraLines += 9;

                } else if (text.length > lineLength * 8) {
                    extraLines += 8;

                } else if (text.length > lineLength * 7) {
                    extraLines += 7;

                } else if (text.length > lineLength * 6) {
                    extraLines += 6;

                } else if (text.length > lineLength * 5) {
                    extraLines += 5;
                    
                } else if (text.length > lineLength * 4) {
                    extraLines += 4;

                } else if (text.length > lineLength * 3) {
                    extraLines += 3;

                } else if (text.length > lineLength * 2) {
                    extraLines += 2;

                } else if (text.length > lineLength) {
                    extraLines ++;

                }

                options = { text: text, size: 24, break: 1 };
                count++;

            }

            // Applying yellow highlight for low-confidence text based on the new average
            if (tr.confidence < newAverage) {
                options.highlight = "yellow";
            }

            return new docx.TextRun(options);
        }
        return null;
    }).filter(tr => tr !== null);

        // Adding a final 'END OF RECORDING' text at the end of the document
        textRuns.push(new docx.TextRun({ text: 'END OF RECORDING', size: 24, break: 1 }));
        count++;

        // Calculate the total number of lines including 'END OF RECORDING'
        let totalLines = textRuns.length + extraLines;


        // Ensuring the last page has 28 lines by addinxg empty TextRuns if needed
        const linesToAdd = 28 - (totalLines % 28);
        for (let i = 0; i < linesToAdd; i++) {
            textRuns.push(new docx.TextRun({ text: ' ', size: 24, break: 1 }));
        }

        // Creating a paragraph with the text runs
        const paragraph = new docx.Paragraph({
            children: textRuns,
            spacing: {
                line: 460,
                lineRule: 'exact'
            }
        });

        // END OF TRANSCRIPT TEAM CODE

        const doc = new docx.Document({
            sections: [{
                properties: {
                    page: {
                        size: {
                            width: docx.convertInchesToTwip(8.5),
                            height: docx.convertInchesToTwip(11)
                        },
                        pageNumbers: {
                            start: 1,
                            formatType: docx.NumberFormat.DECIMAL
                        },
                        borders: {
                            pageBorderLeft: {
                                style: docx.BorderStyle.DOUBLE,
                                size: 1 * 8,
                                space: 4,
                                color: "000000"
                            },
                            pageBorderRight: {
                                style: docx.BorderStyle.SINGLE,
                                size: 1 * 8,
                                space: 4,
                                color: "000000"
                            }
                        }
                    },
                    lineNumbers: {
                        countBy: 1,
                        restart: docx.LineNumberRestartFormat.NEW_PAGE
                    }
                },
                headers: {
                    default: new docx.Header({
                        children: [
                            new docx.Paragraph({
                                children:
                                [
                                    new docx.TextRun(`${filename}.docx`)
                                ]
                            })
                        ]
                    })
                },
                footers: {
                    default: new docx.Footer({
                        children: [
                            new docx.Paragraph({
                                alignment: docx.AlignmentType.CENTER,
                                children: [
                                    new docx.TextRun({
                                        children: [docx.PageNumber.CURRENT], size: 24
                                    })
                                ]
                            })
                        ]
                    })
                },
                children: [paragraph],
            }
            ]
        });

        const vidID = data.videosRanges.videoId;


        const string = await docx.Packer.toBase64String(doc);
        let base64Content = string; // your base64 content
        let base64Buffer = Buffer.from(base64Content, 'base64');
        // we are using just Readable to create a stream, but you can use any library you want
        let stream = new Readable()
        stream._read = () => {
            stream.push(base64Buffer);
            stream.push(null);
        };
        
        let content_size = Buffer.byteLength(base64Content, 'base64');

        // you have to pass options and define content length
        let options = {
            content_length: content_size
        };

        //checklist of name and size for preflight check
        let checklist = {
            name: null,
            size: content_size
        };

        let tempFileName = filename;
        let tries = 0;
        while(tries <= MAX_TRIES) {
            try {
                checklist.name = `${tempFileName}.docx`;
                const file = await appUserClient.files.preflightUploadFile(folderID, checklist, null);
                const upload = await appUserClient.files.uploadFile(folderID, `${tempFileName}.docx`, stream, options);
                tries = MAX_TRIES + 1;
                console.log("Finished - tries: ", tries, "\nFilename: ", tempFileName);
                resolve();
            } catch (error) {
                // if correct error otherwise rethrow 
                let body = error.response.body;
                if(body.code === 'item_name_in_use') {
                    if(tries > 0 && tempFileName.slice(-4) === ` (${tries})`) {
                        tempFileName = tempFileName.slice(0, -4);
                    } 
                    tempFileName = tempFileName.concat( ` (${tries+1})`);
                    console.log(`${tries+1}: ${tempFileName}`);
                }
                else throw(error);
            }

            tries++;
        }
    });  
}

module.exports.TranscribeDoc = TranscribeDoc;
