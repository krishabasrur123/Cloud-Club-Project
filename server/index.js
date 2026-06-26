const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
console.log("ENV CHECK MONGO_URI:", process.env.MONGO_URI);
console.log("ENV CHECK PORT:", process.env.PORT);
const { jsonrepair } = require("jsonrepair");

// Default difficulty/time estimates by task type when model omits them
function defaultDifficulty(type = "") {
  const t = type.toLowerCase();
  if (/final|exam/.test(t))    return 9;
  if (/midterm/.test(t))       return 8;
  if (/project/.test(t))       return 7;
  if (/quiz/.test(t))          return 5;
  if (/homework|hw/.test(t))   return 4;
  return 5;
}
function defaultTime(type = "") {
  const t = type.toLowerCase();
  if (/final|exam/.test(t))    return 20;
  if (/midterm/.test(t))       return 15;
  if (/project/.test(t))       return 12;
  if (/quiz/.test(t))          return 2;
  if (/homework|hw/.test(t))   return 4;
  return 5;
}


const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk')); 

const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
AWSXRay.enableAutomaticMode();


// Wrap AWS SDK v3 client with X-Ray
const bedrockClient = AWSXRay.captureAWSv3Client(
  new BedrockRuntimeClient({ region: process.env.AWS_REGION })
);

// Make bedrockClient available to route files via app.locals
// (app is defined below — we attach after app = express())


AWSXRay.enableAutomaticMode(); // or enableManualMode() if you want manual segments

const fs = require("fs");
const app = express();

// Expose bedrockClient to all route handlers via app.locals
app.locals.bedrockClient = bedrockClient;


// Middleware
app.use(cors());  // allow all origins in dev
app.use(express.json());

// Route imports
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const taskRoutes = require("./routes/taskRoutes");
app.use("/api/tasks", taskRoutes);

const scheduleRoutes = require("./routes/scheduleRoutes");
app.use("/api/schedule", scheduleRoutes);

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
            text: `Extract all academic learning content from the course text below.

RULES:
- Extract ONLY educational/conceptual content — topics, concepts, explanations.
- Ignore logistics: office hours, grading, attendance, instructor info, due dates.
- Output ONLY a raw JSON array. No explanation, no preamble, no markdown, no notes.
- Start your response with [ and end with ]. Nothing else.

JSON format — return one object per major topic:
[
  {
    "Header": "Topic Name",
    "Subheaders": ["Subtopic A", "Subtopic B"],
    "Questions": ["What is X?", "How does Y work?"],
    "Content": "Detailed explanation of the topic from the text.",
    "Summary": "1-2 sentence summary of key points."
  }
]

COURSE TEXT:
${content}`
          }]
        }],
        inferenceConfig: { maxTokens: 2000, temperature: 0.1 }
      })
    });

    const result = await bedrockClient.send(command);
    const data   = JSON.parse(new TextDecoder().decode(result.body));
    const raw    = data.output.message.content[0].text;
    console.log("=== RAW CONTENT OUTPUT ===\n", raw.slice(0, 300), "\n==========================");

    let parsed;
    try {
      let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
      const start = cleaned.indexOf("[");
      const end   = cleaned.lastIndexOf("]");
      if (start === -1 || end === -1 || end < start) throw new Error("No JSON array in response");
      let jsonStr = cleaned.slice(start, end + 1).replace(/,\s*([\]}])/g, "$1");
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("extractContent parse error:", e.message, "\nRaw:", raw);
      return res.status(500).json({ error: "Model did not return valid JSON", rawOutput: raw });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(500).json({ error: "No content extracted", rawOutput: raw });
    }

    res.json(parsed);
  } catch (err) {
    console.error("extractContent error:", err);
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
            text: `Generate questions from the course content below.

RULES:
- Output ONLY a raw JSON object. No explanation, no preamble, no notes, no markdown.
- Start your response with { and end with }. Nothing else.
- Generate exactly 8 academic MCQs testing conceptual understanding (NOT logistics/dates/grading).
- Then add exactly 2 meta-questions at the end:
  1. Confidence: "How confident are you in your understanding of this topic?"
     options: ["Very confident","Somewhat confident","Neutral","Not very confident","Unsure"]
     type: "confidence", answer: "NONE"
  2. Time: "How much more time do you think you need to master this content?"
     options: ["I have mastered it","Need a quick review","Need enough time for homework","Need significant study time"]
     type: "time_estimation", answer: "NONE"

JSON format:
{
  "topics": ["Topic 1", "Topic 2"],
  "questions": [
    {
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "type": "mcq",
      "answer": "A"
    }
  ]
}

COURSE CONTENT:
${content}`
          }]
        }],
        inferenceConfig: { maxTokens: 3000, temperature: 0.1 }
      })
    });

    const result  = await bedrockClient.send(command);
    const data    = JSON.parse(new TextDecoder().decode(result.body));
    const raw     = data.output.message.content[0].text;
    console.log("=== RAW QUESTIONS OUTPUT ===\n", raw.slice(0, 300), "\n============================");

    let parsed;
    try {
      let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
      const start = cleaned.indexOf("{");
      const end   = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1 || end < start) throw new Error("No JSON object in response");
      let jsonStr = cleaned.slice(start, end + 1).replace(/,\s*([\]}])/g, "$1");
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("extractQuestions parse error:", e.message, "\nRaw:", raw);
      return res.status(500).json({ error: "Model did not return valid JSON", rawOutput: raw });
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return res.status(500).json({ error: "No questions in response", rawOutput: raw });
    }

    res.json(parsed);
  } catch (err) {
    console.error("extractQuestions error:", err);
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
        messages: [
          {
            role: "user",
            content: [{
              text: `Extract all academic deadlines from the syllabus text below.

RULES:
- Include only items with a specific date (Homework, Midterm, Final Exam, Project, Quiz).
- Ignore office hours, grading policies, attendance, and logistics.
- Output ONLY a raw JSON array. No explanation, no preamble, no notes, no markdown.
- Start your response with [ and end with ]. Nothing else.
- If no deadlines found, return [].

JSON format:
[
  {
    "type": "Midterm",
    "date": "2026-02-10",
    "time": "2:00pm",
    "description": "Midterm exam",
    "AI_estimateDifficulty": 7,
    "AI_estimateTime": 10.0
  }
]

For each item also include:
- "AI_estimateDifficulty": integer 1-10 based on task type and subject complexity
- "AI_estimateTime": float hours a typical student would need

SYLLABUS TEXT:
${content}`
            }]
          }
        ],
        inferenceConfig: {
          maxTokens: 2000,
          temperature: 0.1
        }
      })
    });

    const result = await bedrockClient.send(command);
    const data = JSON.parse(new TextDecoder().decode(result.body));
    const raw = data.output.message.content[0].text;

    console.log("=== RAW DEADLINES MODEL OUTPUT ===\n", raw, "\n==================================");

    let parsed;
    try {
      // Strip markdown fences
      let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
      // Isolate just the JSON array — everything from first [ to last ]
      const start = cleaned.indexOf("[");
      const end   = cleaned.lastIndexOf("]");
      if (start === -1 || end === -1 || end < start) {
        throw new Error("No JSON array found in response");
      }
      let jsonString = cleaned.slice(start, end + 1);
      // Remove trailing commas before ] or }
      jsonString = jsonString.replace(/,\s*([\]}])/g, "$1");
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON Parse Error:", e.message, "\nRaw:", raw);
      return res.status(500).json({ error: "Model did not return valid JSON", rawOutput: raw });
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      parsed = [{
        type: "General Study",
        date: "2026-12-31",
        time: "TBD",
        description: "Course Mastery (Auto-generated)",
        AI_estimateDifficulty: 5,
        AI_estimateTime: 10.0
      }];
    } else {
      // Fill in missing AI fields with sensible defaults
      parsed = parsed.map(item => ({
        ...item,
        AI_estimateDifficulty: item.AI_estimateDifficulty ?? defaultDifficulty(item.type),
        AI_estimateTime:       item.AI_estimateTime       ?? defaultTime(item.type),
      }));
    }
    


    res.json(parsed);
  }  catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.use(AWSXRay.express.closeSegment());