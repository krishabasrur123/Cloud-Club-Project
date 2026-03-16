const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
console.log("ENV CHECK MONGO_URI:", process.env.MONGO_URI);
console.log("ENV CHECK PORT:", process.env.PORT);
const { jsonrepair } = require("jsonrepair");


const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk')); 

const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
AWSXRay.enableAutomaticMode();


// Wrap AWS SDK v3 client with X-Ray
const bedrockClient = AWSXRay.captureAWSv3Client(
  new BedrockRuntimeClient({ region: process.env.AWS_REGION })
);

AWSXRay.enableAutomaticMode(); // or enableManualMode() if you want manual segments

const fs = require("fs");
const app = express();


// Middleware
app.use(cors());
app.use(express.json());

// Route imports
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const taskRoutes = require("./routes/taskRoutes");
app.use("/api/tasks", taskRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Nova AI Backend Running");
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

/*
  //Huggingface model
app.get("/test-ai", async (req, res) => {
  try {
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          messages: [
            {
              role: "user",
              content: "Generate 3 conceptual questions about Newton's Laws."
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.log("HF ERROR:", data);
      return res.status(response.status).json(data);
    }

    res.json({
      result: data.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});


// -------------------- Extract Content Route --------------------
app.post("/api/extractContent", async (req, res) => {
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          messages: [
            {
              role: "system",
              content:
                "You are a teaching assistant. You need to extract course-content from the given class information",
            },
            {
              role: "user",
              content: `
    You are an AI teaching assistant.

           Extract **all relevant educational content** from a class syllabus, homework, documentation, or specification PDF.

Instructions:

Extract ONLY academic learning content from the syllabus.
ONLY keep sections that teach/talk about the course concepts
Ignore administrative or logistics sections such as:
- instructors
- TA information
- office hours
- grading policies
- exams
- discussion sections
- email policy
- participation
- homework policies
- bonus credit
- late day policies

1. Identify all **main topics/headers** and **subtopics/subheaders**.  
2. For each topic or subtopic, extract or infer:
   - **Header** (required)
   - **Subheaders** (optional)
   - **Learning questions** students should be able to answer after studying this section (required)
   - **Detailed content / explanations** (required)
   - **Summary of key points** (required)
3. Include **bullet points, examples, or detailed descriptions** if present in the text.  
4. **Do not miss any details explicitly stated** in the professor's notes, syllabus, or PDF.  
5. If any field is missing, **infer reasonable content** based on educational knowledge of the topic.  
6. Important: Return **only JSON**, do **not** include any explanation, commentary, or text outside of the JSON. 
The output must be directly parseable by JSON.parse().

[
  {
    "Header": "Main Topic Name",
    "Subheaders": ["Subtopic 1", "Subtopic 2"],
    "Questions": ["Question 1", "Question 2"],
    "Content": "Detailed explanation or content from the document",
    "Summary": "Brief summary of this topic"
  },
  ...
]

COURSE TEXT:
${content}
`,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(500).json(data);



    let rawContent = data.choices[0].message.content;
const match = rawContent.match(/\{[\s\S]*\}/);
if (!match) {
  return res.status(500).json({ error: "No JSON found", rawOutput: rawContent });
}
let jsonBlock = match[0];
jsonBlock = jsonrepair(jsonBlock);


    let parsed;
    try {
      parsed = JSON.parse(rawContent);

    } catch (e) {
      return res.status(500).json({ error: "Model did not return valid JSON", rawOutput: rawContent });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Extracting Content Failed" });
  }
});

// -------------------- Extract Questions Route --------------------

app.post("/api/extractQuestions", async (req, res) => {
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          response_format: {type: "json_object" },

          messages: [
            {
              role: "system",
              content:
                "You are a teaching assistant AI that creates conceptual MCQ questions."
            },
            {
              role: "user",
              content: `Given the course content below, do these things:

1. Identify the main topics/concepts taught in this course.

2. For each topic, infer related subtopics using general academic knowledge 
   even if they are not explicitly mentioned in the text.

3. Generate 10 multiple-choice knowledge-check questions that test
   conceptual understanding of these topics and related subtopics.

The questions should NOT simply restate course headings.
They should test understanding of the underlying concepts typically
associated with the topics.

Example:
If the topic is "Machine Learning", valid question areas include:
- supervised vs unsupervised learning
- loss functions
- gradient descent
- overfitting
- training vs inference

Each question should:
- Cover a key topic OR an inferred related concept
- Include 3–5 options
- Have exactly one correct answer
- At least one question must be a confidence/knowledge-level question

Guidelines for the questions:

Questions should test conceptual understanding, not memorization of course logistics.

Do NOT generate questions about course housekeeping and course logistics, such as:

grading policies

due dates

attendance

office hours

course schedule

assignment submission details

instructor information

Only generate questions about academic subject matter and concepts.

Additional rules:

Questions should NOT simply restate course headings.

Prefer conceptual or applied questions.

Use general knowledge of the subject area to expand topics.

Important rules:
- Avoid questions that directly copy wording from the course text
- Prefer conceptual or applied questions
- Use general knowledge of the subject area to generate meaningful questions

Return ONLY JSON.
The output must be directly parseable by JSON.parse().

Format:
{
  "topics": ["topic 1", "topic 2"],
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "type": "mcq",
      "answer": "Correct option"
    }
  ]
}

If type = "confidence", set answer to "NONE".

COURSE CONTENT BELOW:
\n\n${content}`
            }
          ],
          temperature: 0.6
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("HF API error:", data);
      return res.status(500).json(data);
    }

    const content_new = data?.choices?.[0]?.message?.content;
    console.log(content_new);

    if (!content_new) {
      console.error("Invalid model response:", data);
      return res.status(500).json({ error: "Invalid model response", raw: data });
    }

    const jsonMatch = content_new.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({ error: "No JSON in response", rawOutput: content_new });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extracting Questions Failed" });
  }
});

// -------------------- Extract Deadlines Route --------------------
app.post("/api/extractDeadlines", async (req, res) => {
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [
          {
            role: "system",
            content: "You extract academic deadlines and return ONLY valid JSON.",
          },
          {
            role: "user",
            content: `
Extract all academic deadlines from this syllabus.

Classify each as:
- Midterm
- Final Exam
- Project
- Homework
- Quiz
- Other

Return ONLY valid JSON in this format:

[
  {
    "type": "Midterm",
    "date": "2026-02-10",
    "time": "2:00pm",
    "description": "Midterm exam"
  }
]

TEXT:
${content}
          `,
          },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json(data);

    const raw = data.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ error: "Model did not return valid JSON", rawOutput: raw });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extracting Deadlines Failed" });
  }
});

*/


//Amazon Bedrock Lite model

//test-ai route using Amazon Nova Lite

app.use(AWSXRay.express.openSegment('NovaLite2Test')); // trace incoming requests

app.post('/test-ai', async (req, res) => {
  try {
    const prompt = req.body.prompt || "Hello Nova Lite 2!";
    
    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId: "us.amazon.nova-2-lite-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: {maxTokens: 500, temperature: 0.7 }
      })
    });

    const result = await bedrockClient.send(command);
    const responseBody = JSON.parse(Buffer.from(result.body).toString("utf-8"));
    res.json({ output: responseBody?.output?.message?.content?.[0]?.text || responseBody });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.use(AWSXRay.express.closeSegment()); // close X-Ray segment

// -------------------- Extract Content Route --------------------







// -------------------- Extract Deadlines Route --------------------



app.use(AWSXRay.express.openSegment('NovaAssistantApp'));

// -------------------- Extract Content Route --------------------
app.post("/api/extractContent", async (req, res) => {
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const command = new InvokeModelCommand({
      modelId: "us.amazon.nova-2-lite-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: [{
            text: `
   
    You are an AI teaching assistant.

           Extract **all relevant educational content** from a class syllabus, homework, documentation, or specification PDF.

Instructions:

Extract ONLY academic learning content from the syllabus.
ONLY keep sections that teach/talk about the course concepts
Ignore administrative or logistics sections such as:
- instructors
- TA information
- office hours
- grading policies
- exams
- discussion sections
- email policy
- participation
- homework policies
- bonus credit
- late day policies

1. Identify all **main topics/headers** and **subtopics/subheaders**.  
2. For each topic or subtopic, extract or infer:
   - **Header** (required)
   - **Subheaders** (optional)
   - **Learning questions** students should be able to answer after studying this section (required)
   - **Detailed content / explanations** (required)
   - **Summary of key points** (required)
3. Include **bullet points, examples, or detailed descriptions** if present in the text.  
4. **Do not miss any details explicitly stated** in the professor's notes, syllabus, or PDF.  
5. If any field is missing, **infer reasonable content** based on educational knowledge of the topic.  
6. Important: Return **only JSON**, do **not** include any explanation, commentary, or text outside of the JSON. 
The output must be directly parseable by JSON.parse().

[
  {
    "Header": "Main Topic Name",
    "Subheaders": ["Subtopic 1", "Subtopic 2"],
    "Questions": ["Question 1", "Question 2"],
    "Content": "Detailed explanation or content from the document",
    "Summary": "Brief summary of this topic"
  },
  ...
]

COURSE TEXT:

${content}`
          }]
        }],
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.3
        }
      })
    });

    const result = await bedrockClient.send(command);
    const data = JSON.parse(new TextDecoder().decode(result.body));

    let rawContent = data.output.message.content[0].text;
    const match = rawContent.match(/\{[\s\S]*\}/) || rawContent.match(/\[[\s\S]*\]/);
    
    if (!match) {
      return res.status(500).json({ error: "No JSON found", rawOutput: rawContent });
    }
    
    let jsonBlock = match[0];
    if (typeof jsonrepair !== 'undefined') {
        jsonBlock = jsonrepair(jsonBlock);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonBlock);
    } catch (e) {
      return res.status(500).json({ error: "Model did not return valid JSON", rawOutput: rawContent });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extracting Content Failed" });
  }
});

// -------------------- Extract Questions Route --------------------
app.post("/api/extractQuestions", async (req, res) => {
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const command = new InvokeModelCommand({
      modelId: "us.amazon.nova-2-lite-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: [{
            text:     `Given the course content below, do these things:

1. Identify the main topics/concepts taught in this course.

2. For each topic, infer related subtopics using general academic knowledge 
   even if they are not explicitly mentioned in the text.

3. Generate 10 multiple-choice knowledge-check questions that test
   conceptual understanding of these topics and related subtopics.

The questions should NOT simply restate course headings.
They should test understanding of the underlying concepts typically
associated with the topics.

Example:
If the topic is "Machine Learning", valid question areas include:
- supervised vs unsupervised learning
- loss functions
- gradient descent
- overfitting
- training vs inference

Each question should:
- Cover a key topic OR an inferred related concept
- Include 3–5 options
- Have exactly one correct answer
- At least one question must be a confidence/knowledge-level question

Guidelines for the questions:

Questions should test conceptual understanding, not memorization of course logistics.

Do NOT generate questions about course housekeeping and course logistics, such as:

grading policies

due dates

attendance

office hours

course schedule

assignment submission details

instructor information

Only generate questions about academic subject matter and concepts.

Additional rules:

Questions should NOT simply restate course headings.

Prefer conceptual or applied questions.

Use general knowledge of the subject area to expand topics.

Important rules:
- Avoid questions that directly copy wording from the course text
- Prefer conceptual or applied questions
- Use general knowledge of the subject area to generate meaningful questions

Return ONLY JSON.
The output must be directly parseable by JSON.parse().
Gemini said
To ensure the model consistently produces valid, parseable JSON and avoids the "trailing comma" error you just encountered, add this Important Rules section to your prompt.

Important Rules for JSON Generation
1. Strict JSON Compliance:

Return only valid JSON. Do not include any introductory text (e.g., "Here is the JSON..."), markdown explanations, or closing remarks.

All keys and string values must be enclosed in double quotes ("key": "value").

Ensure all brackets [ ] and braces {} are properly balanced and closed.

2. No Trailing Commas (CRITICAL):

Do not place a comma after the last element in an array.

Do not place a comma after the last property in an object.

Incorrect: ["A", "B",]

Correct: ["A", "B"]

3. Structural Consistency:

If the instruction asks for an array, start the response with [ and end with ].

If the instruction asks for an object, start the response with { and end with }.

Do not wrap the final output in a parent object (e.g., { "data": [...] }) unless explicitly requested.

4. Content Formatting:

Use \n for newlines within string values if necessary.

Escape any double quotes used within the text itself using a backslash (e.g., "The professor said, \"Study hard.\"").

Format:
{
  "topics": ["topic 1", "topic 2"],
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "type": "mcq",
      "answer": "Correct option"
    }
  ]
}

If type = "confidence", set answer to "NONE".

COURSE CONTENT BELOW: \n\n
${content}`
          }]
        }],
        inferenceConfig: {
          maxTokens: 2000,
          temperature: 0.6
        }
      })
    });

    const result = await bedrockClient.send(command);
    const data = JSON.parse(new TextDecoder().decode(result.body));

    const content_new = data.output.message.content[0].text;
    console.log(content_new);

    if (!content_new) {
      return res.status(500).json({ error: "Invalid model response", raw: data });
    }

    const jsonMatch = content_new.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({ error: "No JSON in response", rawOutput: content_new });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extracting Questions Failed" });
  }
});

// -------------------- Extract Deadlines Route --------------------
app.post("/api/extractDeadlines", async (req, res) => {
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const command = new InvokeModelCommand({
      modelId: "us.amazon.nova-2-lite-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: [{
            text: `
Extract all academic deadlines from this syllabus.
Only include items that have an actual date or deadline.  
- Classify each deadline as one of the following types:  
  - Midterm  
  - Final Exam  
  - Project  
  - Homework  
  - Quiz  

Do NOT include anything else — ignore all administrative, logistical, or non-academic text.  
Return ONLY valid JSON in this format:

[
  {
    "type": "Midterm",
    "date": "2026-02-10",
    "time": "2:00pm",
    "description": "Midterm exam"
  }
]


TEXT:
${content}`
          }]
        }],
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.3
        }
      })
    });

    const result = await bedrockClient.send(command);
    const data = JSON.parse(new TextDecoder().decode(result.body));

    const raw = data.output.message.content[0].text;

    let parsed;
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch (e) {
      return res.status(500).json({ error: "Model did not return valid JSON", rawOutput: raw });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extracting Deadlines Failed" });
  }
});

app.use(AWSXRay.express.closeSegment());