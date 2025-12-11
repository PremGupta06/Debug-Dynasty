const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    skills: [String],
    job_roles: [String],
    missing_skills: [String],
    experience_level: String,
    optimised_resume_headline: String,
    one_year_learning_path: [String]
  },
  { _id: false }
);

const resumeAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    resumeText: {
      type: String
    },
    analysis: analysisSchema
  },
  { timestamps: true }
);

const ResumeAnalysis = mongoose.model(
  "ResumeAnalysis",
  resumeAnalysisSchema
);

module.exports = ResumeAnalysis;
