# LeetCode Categorizer

This Node.js application fetches your accepted submissions from LeetCode, categorizes them by problem tags (e.g., array, DFS, BFS), and generates a markdown file containing a list of problems by tag with links to the LeetCode problems.

## Usage

### Clone the repository

```bash
git clone https://github.com/mohllal/leetcode-categorizer.git
cd leetcode-categorizer
```

### Install dependencies

```bash
npm install
```

### Set up LeetCode session

To authenticate with LeetCode, you need your LeetCode session token. You can find your LeetCode session token in the browser's cookies when you're logged into LeetCode.

Save the session token in an `.env` file in the root directory:

```bash
touch .env
```

In `.env`, add the following:

```bash
LEETCODE_SESSION=<YOUR_LEETCODE_SESSION_HERE>
```

### Running the Application

#### Locally

```bash
npm start
```

This will:

- Fetch your accepted submissions from LeetCode.
- Categorize them by problem tags.
- Generate a markdown file containing all the categorized problems.

#### Running with Docker

Build the Docker Image

```bash
docker build -t leetcode-categorizer .
```

Run the Container

Make sure your `.env` file contains the `LEETCODE_SESSION` and then run the Docker container:

```bash

docker run --env-file .env -v ./:/app leetcode-categorizer
```

This will:

- Run the containerized version of the application, fetch your LeetCode submissions, and generate the markdown file.

## Troubleshooting

- Session Expiration: If the session token expires, you will need to update your `.env` file with a new session token from LeetCode.
- API Rate Limiting: LeetCode may throttle requests if you send too many in a short period. You can handle this by adding retries or delay logic if necessary.

## Future Enhancements

- Add retry logic for failed API requests.
- Add support for fetching submission details in batch mode to improve performance.
- Integrate with GitHub Actions to periodically update the markdown with your latest submissions.
- Dynamically update the progress bar based on remaining tasks in the process.
