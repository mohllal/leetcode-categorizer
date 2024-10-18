import fs from 'fs'
import dotenv from 'dotenv';
import cliProgress from 'cli-progress';
import winston from 'winston';
import { LeetCode, Credential } from "leetcode-query";

// Load environment variables from .env file if it exists
dotenv.config();

const LEETCODE_SESSION = process.env.LEETCODE_SESSION; // Read session from environment variables
const OUTPUT_FILE = process.env.OUTPUT_FILE || 'SOLUTIONS.md'; // Read output file name from environment variables, defaulting to 'SOLUTIONS.md' if not set

if (!LEETCODE_SESSION) {
  throw new Error('LEETCODE_SESSION environment variable is missing.');
}

// Initialize credentials using session from environment variables
const credential = new Credential();
await credential.init(LEETCODE_SESSION);

// Create a new instance of LeetCode API with authenticated credentials
const leetcode = new LeetCode(credential);

// Initialize a progress bar for tracking progress during the process
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// Configure Winston logger with timestamp, colorized output, and custom log format
const logger = winston.createLogger({
  level: 'info', // Set the log level to 'info'
  format: winston.format.combine(
    winston.format.colorize(), // Apply color to the log level
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss' // Format for timestamps in logs
    }),
    winston.format.printf(({ timestamp, level, message }) => {
      // Custom log format with timestamp, log level, and message
      return `${timestamp} [${level}]: ${message}\n`;
    })
  ),
  transports: [
    new winston.transports.Console() // Output logs to the console
  ]
});

// Function to fetch all accepted submissions with pagination and deduplication
async function fetchAcceptedSubmissions() {
  try {
    const limit = 100; // Number of submissions to fetch per page
    let offset = 0;
    let allSubmissions = [];
    let hasMore = true;

    logger.info('Starting to fetch submissions...'); // Log the start of the process

    // Loop until all submissions are fetched
    while (hasMore) {
      const submissions = await leetcode.submissions({ limit, offset });

      if (submissions.length === 0) {
        // No more submissions to fetch, exit loop
        logger.info('No more submissions to fetch.');
        hasMore = false;
      } else {
        // Append fetched submissions to the list
        allSubmissions = allSubmissions.concat(submissions);
        offset += limit; // Move to the next set of submissions
        logger.info(`Fetched ${submissions.length} submissions. Total so far: ${allSubmissions.length}\n`);

        // Update the progress bar based on the number of submissions fetched
        progressBar.increment(submissions.length);
      }
    }

    logger.info(`Finished fetching submissions. Total fetched: ${allSubmissions.length}`);

    // Filter submissions to keep only those with 'Accepted' status
    const acceptedSubmissions = allSubmissions.filter(submission => submission.statusDisplay === 'Accepted');
    logger.info(`Filtered accepted submissions. Total accepted: ${acceptedSubmissions.length}`);

    // Deduplicate submissions: keep only the latest submission per problem (based on timestamp)
    const uniqueSubmissions = acceptedSubmissions.reduce((acc, submission) => {
      const { titleSlug, timestamp } = submission;

      // Replace the existing submission if the current one has a later timestamp
      if (!acc[titleSlug] || acc[titleSlug].timestamp < timestamp) {
        acc[titleSlug] = submission;
      }

      return acc;
    }, {});

    // Convert the deduplicated object to an array
    const uniqueAcceptedSubmissions = Object.values(uniqueSubmissions);
    logger.info(`Filtered unique accepted submissions. Total unique accepted: ${uniqueAcceptedSubmissions.length}`);

    // Update progress bar after filtering and deduplication
    progressBar.increment(allSubmissions.length);

    return uniqueAcceptedSubmissions;
  } catch (error) {
    // Log any errors encountered during fetching
    logger.error('Error fetching submissions:', error);
  }
}

// Function to categorize submissions by problem tags
async function categorizeByTags(acceptedSubmissions) {
  try {
    const categorized = {};

    logger.info('Categorizing submissions by problem tags...'); // Log the start of the categorization process

    // Loop through each accepted submission to fetch problem metadata
    for (const submission of acceptedSubmissions) {
      const problem = await leetcode.problem(submission.titleSlug);

      // Extract the problem's tags (topics) from the metadata
      const tags = problem.topicTags.map(tag => tag.name);

      // Categorize the submission under each tag
      tags.forEach(tag => {
        if (!categorized[tag]) {
          categorized[tag] = [];
        }

        // Add the submission to the category
        categorized[tag].push({
          title: submission.title,
          link: `https://leetcode.com/problems/${submission.titleSlug}/`
        });

        // Update the progress bar for each categorized submission
        progressBar.increment(1);
      });
    }

    logger.info(`Categorization complete. Total number of categories: ${Object.keys(categorized).length}`);

    return categorized;
  } catch (error) {
    // Log any errors encountered during categorization
    logger.error('Error categorizing submissions:', error);
  }
}

// Function to generate the README markdown content from the categorized submissions
function generateMarkdown(categorized) {
  try {
    let markdown = '# Accepted LeetCode Problems by Tag\n\n';

    logger.info('Generating markdown...'); // Log the start of markdown generation

    // Loop through each tag and append its problems to the markdown content
    for (const tag in categorized) {
      markdown += `## ${tag}\n\n`;
      markdown += '|  Problem  |  Link  |\n';
      markdown += '|:---------:|:------:|\n';

      categorized[tag].forEach(problem => {
        markdown += `| ${problem.title} | [Link](${problem.link}) |\n`;
      });

      markdown += '\n';

      // Update the progress bar for each categorized submission
      progressBar.increment(1);
    }

    logger.info('Markdown generation complete.');
    return markdown;
  } catch (error) {
    // Log any errors encountered during markdown generation
    logger.error('Error generating markdown:', error);
  }
}

// Main Execution - IIFE to run the process
(async () => {
  logger.info('Starting process to fetch, categorize, and generate markdown...');

  // Start progress bar with an initial estimate of 1000 steps
  progressBar.start(2000, 0);

  // Step 1: Fetch unique accepted submissions
  const acceptedSubmissions = await fetchAcceptedSubmissions();

  // Step 2: Categorize the submissions by problem tags
  const categorized = await categorizeByTags(acceptedSubmissions);

  // Step 3: Generate markdown content from the categorized submissions
  const markdown = generateMarkdown(categorized);

  // Step 4: Write the generated markdown content
  fs.writeFileSync(OUTPUT_FILE, markdown);

  logger.info(`${OUTPUT_FILE} has been updated successfully!`); // Log successful completion

  // Stop the progress bar once the process is complete
  progressBar.stop();
})();
