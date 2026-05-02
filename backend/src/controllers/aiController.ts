import { Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';
import Groq from 'groq-sdk';

export const generateAiWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Validate access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isOwner = project.ownerId === userId;
    const isMember = project.members.some(m => m.userId === userId);

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Initialize Groq
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
    }

    const groq = new Groq({ apiKey });

    const prompt = `
You are an expert Scrum Master and Agile Coach.
Analyze the following project and generate a Sprint Backlog of 5 to 8 suggested tasks to kickstart the project.

Project Title: "${project.title}"
Project Description: "${project.description || 'No description provided.'}"

Return the result STRICTLY as a raw JSON array. DO NOT wrap the response in markdown blocks (e.g. \`\`\`json). DO NOT include any conversational text.
The JSON array MUST follow this exact schema:
[
  {
    "title": "String - Concise actionable task title",
    "description": "String - Detailed task description with acceptance criteria",
    "priority": "LOW" | "MEDIUM" | "HIGH",
    "estimatedDays": Number - Estimated days to complete (integer between 1 and 14)
  }
]
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
    });

    const rawText = chatCompletion.choices[0]?.message?.content || '';

    try {
      // BULLETPROOF PARSING
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : rawText;

      const aiTasks = JSON.parse(cleanJson);
      res.status(200).json(aiTasks);
    } catch (parseError: any) {
      console.error("AI JSON Parsing Error:");
      console.error("Raw Text returned by Groq:", rawText);
      console.error("Parse Error Details:", parseError.message);
      res.status(500).json({ error: 'Failed to parse AI response into JSON. Check server logs.' });
    }
  } catch (error: any) {
    console.error("AI Workflow Generation Error:", error);
    res.status(500).json({ error: 'Failed to generate AI workflow', details: error.message });
  }
};
