# Box.com and eDefender Integration 

### Description 

Currently, the Public Defender’s office has a content management system called eDefender, parent company Journal Technologies. The Department has transitioned to a fully paperless case management system. As the transition from paper to paperless continues, we’ve migrated all files to the cloud with Box.com. Box.com is a cloud content management tool that allows the Public Defender to be compliant with CJIS/HIPAA requirements, have available storage to store all files digitally, have a collaborative platform, workflow automation, build API’s to eDefender and allow governance.

Overall, we have roughly 100 terabytes of data that has been migrated to the cloud as we’ve handled the digital tsunami. The tsunami has grown as of April 2023 to approximately 5-6 terabytes of electronically stored information (ESI) a month and continues to grow. The files are made up of a variety of file formats and media players. The monthly ingestion of ESI is larger than the entire yearly consumption was three years ago.

The Public Defender is leveraging Box.com to build the necessary infrastructure and support our network needs. One of the applications within Box.com we are planning to leverage is the Box Skills framework, which allows easy integration with third-party machine-learning technologies. Using this framework, we can integrate with AWS and Microsoft Video Indexer to build an automated workflow that utilizes facial recognition and transcription (similar to LA County Public Defender project). In the previous term, the automation and integration were created for English content that was fed into the Box.com web interface. Once files are uploaded, they are transcribed/facial recognition/keyword searched and placed back in Box Skills templates. An additional transcript document is also created and uploaded to the original file’s folder. The goal for this term is to improve the transcription accuracy, the transcription marking and correction abilities, implement security for production deployment, and restructuring for anticipated multi-language support and translation. 

![Alt text](diagram.png?raw=true "Diagram")

### Background Information 

Electronic discovery is the electronic aspect of the discovery process (defined by Penal Code § 1054) wherein in a criminal case, the criminal defense attorney and the District Attorney’s Office obtain copies of the evidence that has been gathered. Digital evidence exists in almost every case that moves through the criminal justice system, from the least complex misdemeanor to the most serious charges. This evidence is central to and affects the decision-making of both the prosecution and defense. The influx of digital evidence, ranging from body worn cameras to cell phone and computer hard drives, has caused data requirements for some criminal cases to be many gigabytes of data. For context, one gigabyte of data can hold nearly 680,000 text documents, approximately 2,000 low-quality photos, or three minutes of 4k video. This massive amount of data received in the processing of criminal cases creates challenges for both the storage of evidence and movement of electronic discovery among agencies.  


Digital evidence is currently generated and received by law enforcement and provided to the prosecution and defense in a wide variety of formats. Until recently, much of this electronic discovery was transferred between agencies using physical media such as DVDs and flash drives, with highly manual and labor-intensive processes. The large quantities and highly varied formats of electronic discovery, and the highly manual processes for transferring and processing electronic discovery, pose challenges to the ability of County agencies to effectively and reliably comply with the requirements set by the FBI’s Criminal Justice Information Services (CJIS) Division, create delays in the discovery process, and exacerbate delays in the criminal justice process, resulting in additional resource costs to all parties. Staffing and resource challenges across the criminal justice partner agencies contribute significantly to delays, which have downstream effects. The District Attorney’s Office is statutorily and constitutionally mandated to provide discovery to the defense in compliance with California Penal Code § 1054.   A criminal defendant has a statutory and constitutional right to discovery in accordance with California Penal Code § 1054. A delay in providing discovery to the defense may violate a defendant’s due process rights and can lead to unjust outcomes for victims and defendants. And, overall, these delays create roadblocks to access to justice, longer stays in jail, case backlogs in courts, and insufficient time for the prosecution and defense to evaluate a case for meaningful disposition. 


The main objective of this project is to reduce the amount of time the lawyers, investigators, and paralegals will have to invest in reviewing video evidence and to maximize their time working on other parts of the case.  To ensure optimality and cost-efficiency, our goal is to implement an interface such that it allows for scalability while still being within grounds of affordability. The team defined optimality in this project is getting a high accuracy in transcription, high amount of face detection in videos, and ensuring the security of the resources and information being used.


The proliferation of electronic records and digital media has impacted the workload, storage costs, and business strategies across all industries. The criminal legal system is no exception. Over the last ten years the complexity and amount of digital information that is transmitted, stored, tracked, and reviewed between and by justice-involved agencies has grown exponentially.  The Santa Barbara County Public Defender receives discovery (information about the case) from the prosecution and law enforcement agencies. It is commonly comprised of electronically shared digital files that include large PDF files, audio/video media files, cell phone and other device “dumps,” photos, and digital files that contain various technology-based investigative techniques.


In addition to the equipment, maintenance and licensing costs related to storing discovery in an accessible manner, Santa Barbara County Public Defender staff need better tools to help them track, analyze, review, and process cases and discovery.  In order to ethically prepare a case and provide effective assistance of counsel to the client, Santa Barbara County Public Defender staff must be able to efficiently access and systematically review.  In every case, we get body-cam footage from every officer that was on the scene, and our attorneys are drowning in trying to get through all of that evidence.


As public defenders, they are ethically bound to find and review the best possible evidence to secure their client’s defense, and yet public defenders lack the financial and staffing resources to adequately do so.  Public defenders find critical information in body-worn camera footage, jail calls, and interrogation videos.  Client, witness, and officer statements in body-worn camera footage help public defenders identify details missing from police reports.  We know that gold exists in all sorts of audiovisual evidence, and our goal is to level the playing field for public defense — especially in crucial sources of information like police body-worn camera footage, jail calls, and interrogation video.

## Scope

 - Upon upload to Box.com, discovery media is transcribed/translated/facial recognition/keyword search.  Integrate with AWS/Microsoft Video Indexer (similar to LA County project).
 - Transcribed discovery is added to Box Skills template and saved to case file.
 - Transcript word document is properly formatted and marked for low-confidence using the Video Indexer insights before being uploaded to case file.
 - Develop accurate custom English speech and language models in Video Indexer.
 - Implement proper security techniques and best practices using AWS services
 - Restructure modules to prepare for future multi-language support and translation.
 - Update/migrate environment and dependency versions of modules for security.

## Team

| Role | Name | Email | 
| ------------- | ------------- | ------------- | 
| Faculty Advisor | Jungsom Lim | jim34@calstatela.edu | 
| Project Lead | Branden Zamora | bzamor19@calstatela.edu |
| Document Lead | Jacqueline Molina | jmolin84@calstatela.edu | 
| Customer Liaison/Requirments Lead | Donovan Hatfield | dhatfie2@calstatela.edu |
| Architecture/Design Lead | Jose Alvarado | jalva297@calstatel.edu | 
| UI Lead | Brian Mcnaughton | emcnaug@calstatela.edu |
| Backend Lead | Dat "Justin" Nguyen | dnguye163@calstatela.edu |
| Database Schema Lead | Coby Alvarez | calvar108@calstatela.edu |
| QA/QC Lead | Florian Haule | fhaule@calstatela.edu |
| Demo Lead | Luis Perez Campos | lperez105@calstatela.edu |
| Presentation Lead	 | Leo Gallardo | lgallar9@calstatela.edu |

### Meeting Schedule 

| Category | Date | Time | 
| ------------- | ------------- | ------------- | 
| Bi-weekly Liaison Meeting time | Friday | 9:00 am - 10:00 am | 
| Weekly Advisor Group Meeting | Friday | 11:00 am - 12:00 pm |
| Team Meeting | Friday | 3:00 pm - 5:00 pm | 
