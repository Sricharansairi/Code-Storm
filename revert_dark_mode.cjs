const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\sricharan\\.gemini\\antigravity-ide\\brain\\002b7891-a89b-49d1-99a5-7f9e7529c706\\.system_generated\\logs\\transcript_full.jsonl';

async function processLog() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const reversions = {}; // filepath -> array of { search, replace }

    for await (const line of rl) {
        try {
            const entry = JSON.parse(line);
            if (entry.type === 'PLANNER_RESPONSE' && entry.tool_calls) {
                for (const tool of entry.tool_calls) {
                    if (tool.name === 'multi_replace_file_content') {
                        const instruction = tool.args.Instruction || "";
                        if (instruction.includes('dark glassmorphism theme') || instruction.includes('dark mode')) {
                            const targetFile = tool.args.TargetFile;
                            if (!reversions[targetFile]) {
                                reversions[targetFile] = [];
                            }
                            
                            // The edit was: TargetContent -> ReplacementContent
                            // So to revert, we do: ReplacementContent -> TargetContent
                            for (const chunk of tool.args.ReplacementChunks) {
                                reversions[targetFile].push({
                                    search: chunk.ReplacementContent,
                                    replace: chunk.TargetContent
                                });
                            }
                        }
                    } else if (tool.name === 'replace_file_content') {
                        const instruction = tool.args.Instruction || "";
                        if (instruction.includes('dark glassmorphism theme') || instruction.includes('dark mode') || instruction.includes('revert')) {
                            const targetFile = tool.args.TargetFile;
                            if (!reversions[targetFile]) {
                                reversions[targetFile] = [];
                            }
                            // Only add if it's not the recent revert I just tried
                            if (!tool.args.ReplacementContent.includes("3b82f6")) {
                                reversions[targetFile].push({
                                    search: tool.args.ReplacementContent,
                                    replace: tool.args.TargetContent
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }

    console.log(`Found ${Object.keys(reversions).length} files to revert.`);
    
    for (const [filepath, changes] of Object.entries(reversions)) {
        if (!fs.existsSync(filepath)) continue;
        
        let content = fs.readFileSync(filepath, 'utf8');
        let modified = false;
        
        // Apply reversions in reverse order just in case, or normal order
        for (const change of changes) {
            if (content.includes(change.search)) {
                content = content.replace(change.search, change.replace);
                modified = true;
            } else {
                console.log(`Could not find chunk in ${filepath}`);
            }
        }
        
        if (modified) {
            fs.writeFileSync(filepath, content, 'utf8');
            console.log(`Reverted ${filepath}`);
        }
    }
}

processLog().catch(console.error);
