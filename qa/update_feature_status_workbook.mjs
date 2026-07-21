import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outputDir = path.join(root, "outputs/019f4d00-5311-7fe1-8127-5fa41a26c804");
const workbookPath = path.join(outputDir, "ai-dashboard-feature-status.xlsx");
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

const initial = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 8000,
  tableMaxRows: 4,
  tableMaxCols: 16,
});
console.log(initial.ndjson);

for (const sheetName of ["Summary", "User Stories", "Errors"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `before-${sheetName.toLowerCase().replace(/ /g, "-")}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const stories = workbook.worksheets.getItem("User Stories");
const errors = workbook.worksheets.getItem("Errors");
const storyRange = stories.getUsedRange(true);
const errorRange = errors.getUsedRange(true);
console.log("STORY_TAIL", (await workbook.inspect({ kind: "table", range: `User Stories!A${Math.max(1, storyRange.rowCount - 3)}:P${storyRange.rowCount}`, include: "values,formulas", tableMaxRows: 5, tableMaxCols: 16 })).ndjson);
console.log("ERROR_TAIL", (await workbook.inspect({ kind: "table", range: `Errors!A${Math.max(1, errorRange.rowCount - 3)}:I${errorRange.rowCount}`, include: "values,formulas", tableMaxRows: 5, tableMaxCols: 9 })).ndjson);

const storyId = "INDEX-015";
const errorId = "ERR-019";
const storyIds = new Set((storyRange.values || []).slice(1).map(row => row[0]));
const errorIds = new Set((errorRange.values || []).slice(1).map(row => row[0]));

if (!storyIds.has(storyId)) {
  stories.tables.items[0].rows.add(null, [[
    storyId,
    "Personal Index",
    "/#personal-index",
    "Leaderboard and cost frontier selector",
    "As a user, I can view my custom index as a horizontal model leaderboard or compare intelligence against real task cost.",
    "The default visualization is a horizontal bar leaderboard ranked by personal-index score, not score-distribution buckets. Cost frontier uses a logarithmic DeepSWE task-cost axis, personal-index intelligence, model labels, and a dotted Pareto line. Benchmark controls start with DeepSWE, Artificial Analysis Intelligence Index, BSBench V2, Terminal-Bench 2.1, and HLE; every remaining available benchmark stays below them.",
    "static/frontier-index-lab.html: BENCHMARK_PRIORITY, renderDistribution, frontierLine; scripts/qa_personal_index_visual.mjs",
    "At least one benchmark selected and qualified models available",
    "Fail",
    "{}",
    "The Histogram control rendered ten score-distribution buckets, the benchmark picker followed ingestion order, and the cost frontier did not disclose its task-cost source.",
    errorId,
    "Fixed",
    "Pass",
    JSON.stringify({
      status: "Pass",
      evidenceClass: "deployed-live",
      target: "https://ai-model-analysis-dashboard.adamholter.chatgpt.site",
      command: "production headless Playwright: populate DeepSWE, Artificial Analysis Intelligence Index, BSBench V2, and Terminal-Bench 2.1; verify leaderboard axes/bars, benchmark order, log DeepSWE cost axis, dotted frontier, desktop/mobile charts, and full-height embed",
      runId: "appgdep_6a5e69dfb60881919060785ea1c06f02",
      recordedAt: "2026-07-20T18:35:30Z",
    }),
    "Production version 46 rendered a 20-row horizontal leaderboard, preserved every remaining benchmark below the priority set, and passed the live dotted Pareto/log-cost checks on desktop, mobile, and the embedded dashboard.",
  ]]);
}

if (!errorIds.has(errorId)) {
  errors.tables.items[0].rows.add(null, [[
    errorId,
    "High",
    "Personal Index visualization",
    "Histogram showed score-distribution buckets instead of a model leaderboard",
    "The visualization grouped models into ten score ranges, obscuring the ranking the user wanted; important benchmark controls also appeared below lower-priority sources.",
    "The prototype interpreted histogram statistically and inherited raw warehouse ordering instead of the product's ranking semantics and benchmark priorities.",
    "Replace buckets with a provider-colored horizontal score leaderboard; add deterministic benchmark priority sorting; keep all other benchmarks; use verified DeepSWE cost-per-task data for the labeled logarithmic Pareto frontier.",
    "Fixed",
    "Pass",
  ]]);
}

const finalStoryCount = stories.getUsedRange(true).rowCount - 1;
const finalStoryEnd = finalStoryCount + 1;
const summary = workbook.worksheets.getItem("Summary");
summary.getRange("B5").values = [[finalStoryCount]];
summary.getRange("B6").formulas = [[`=COUNTIF('User Stories'!$I$2:$I$${finalStoryEnd},"Pass")`]];
summary.getRange("B7").formulas = [[`=COUNTIF('User Stories'!$I$2:$I$${finalStoryEnd},"Fail")`]];
summary.getRange("B8").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${finalStoryEnd},"Pass")`]];
summary.getRange("B9").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${finalStoryEnd},"Local Pass")`]];
summary.getRange("B10").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${finalStoryEnd},"Contract Pass")+COUNTIF('User Stories'!$N$2:$N$${finalStoryEnd},"Unit Pass")+COUNTIF('User Stories'!$N$2:$N$${finalStoryEnd},"Contract/Unit Pass")`]];
summary.getRange("B11").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${finalStoryEnd},"Unverified")`]];
summary.getRange("B12").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${finalStoryEnd},"Fail")`]];
summary.getRange("B13").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${finalStoryEnd},"Not Tested")`]];

const finalStoryRange = stories.getUsedRange(true);
const finalErrorRange = errors.getUsedRange(true);
stories.getRange(`A${finalStoryRange.rowCount}:P${finalStoryRange.rowCount}`).format.autofitRows();
errors.getRange(`A${finalErrorRange.rowCount}:I${finalErrorRange.rowCount}`).format.autofitRows();
console.log("FINAL_STORY", (await workbook.inspect({ kind: "table", range: `User Stories!A${finalStoryRange.rowCount}:P${finalStoryRange.rowCount}`, include: "values,formulas", tableMaxRows: 2, tableMaxCols: 16 })).ndjson);
console.log("FINAL_ERROR", (await workbook.inspect({ kind: "table", range: `Errors!A${finalErrorRange.rowCount}:I${finalErrorRange.rowCount}`, include: "values,formulas", tableMaxRows: 2, tableMaxCols: 9 })).ndjson);
console.log("SUMMARY", (await workbook.inspect({ kind: "table", range: "Summary!A4:B13", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 2 })).ndjson);
console.log("FORMULA_ERRORS", (await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" })).ndjson);

for (const sheetName of ["Summary", "User Stories", "Errors"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName.toLowerCase().replace(/ /g, "-")}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
