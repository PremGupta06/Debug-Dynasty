// backend/utils/parseResumeFile.js
const fs = require("fs").promises;
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function parsePdf(filePath) {
  const data = await fs.readFile(filePath);
  try {
    const pdf = await pdfParse(data);
    return (pdf.text || "").trim();
  } catch (err) {
    console.error("pdf-parse error:", err.message);
    return "";
  }
}

async function parseDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return (result.value || "").trim();
  } catch (err) {
    console.error("mammoth error:", err.message);
    return "";
  }
}

async function parseResumeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt" || ext === ".md") {
    try {
      const txt = await fs.readFile(filePath, "utf8");
      return txt.trim();
    } catch (err) {
      console.error("read txt error:", err.message);
      return "";
    }
  }
  if (ext === ".pdf") {
    const text = await parsePdf(filePath);
    return text;
  }
  if (ext === ".docx") {
    const text = await parseDocx(filePath);
    return text;
  }
  return "";
}

module.exports = { parseResumeFile };
