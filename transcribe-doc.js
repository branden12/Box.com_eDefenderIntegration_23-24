const docx = require('docx');
const fs = require('fs');

// Reading the 'insights.json' file
fs.readFile('insights.json', 'utf-8', (err, data) => {
    if (err) throw err;

    // Parsing the JSON data
    const parsedData = JSON.parse(data);
    const transcript = parsedData.videos[0].insights.transcript;

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

    // Creating a new Word document with specified properties
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
                        formatType: docx.NumberFormat.DECIMAL,
                    },
                    borders: {
                        pageBorderLeft: {
                            style: docx.BorderStyle.DOUBLE,
                            size: 1 * 8,
                            space: 4,
                            color: '000000'
                        },
                        pageBorderRight: {
                            style: docx.BorderStyle.SINGLE,
                            size: 1 * 8,
                            space: 4,
                            color: '000000'
                        }
                    },
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
                            children: [
                                new docx.TextRun('FileName placeholder'),
                            ],
                        }),
                    ],
                }),
            },
            footers: {
                default: new docx.Footer({
                    children: [
                        new docx.Paragraph({
                            alignment: docx.AlignmentType.CENTER,
                            children: [
                                new docx.TextRun({
                                    children: [docx.PageNumber.CURRENT], size: 24
                                }),
                            ],
                        }),
                    ],
                }),
            },
            children: [paragraph],
        }]
    });

    // Saving the document as a Word file
    docx.Packer.toBuffer(doc).then((buffer) => {
        fs.writeFileSync('My Document.docx', buffer);
    });
});
