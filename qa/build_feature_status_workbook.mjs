import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.env.QA_ROOT
  ? path.resolve(process.env.QA_ROOT)
  : path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const rows = JSON.parse(await fs.readFile(path.join(root, "qa/feature_status.json"), "utf8"));
const issues = JSON.parse(await fs.readFile(path.join(root, "qa/errors.json"), "utf8"));
const cleanCell = value => typeof value === "string"
  ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  : value;
const outputDir = path.join(root, "outputs/019f4d00-5311-7fe1-8127-5fa41a26c804");
await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const summary = wb.worksheets.add("Summary");
const stories = wb.worksheets.add("User Stories");
const errors = wb.worksheets.add("Errors");

const navy = "#18324A", teal = "#087E8B", pale = "#EAF4F4", line = "#CBD5E1";
summary.showGridLines = false;
summary.getRange("A1:H2").merge();
summary.getRange("A1").values = [["AI Dashboard Feature & QA Status"]];
summary.getRange("A1:H2").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 20 }, verticalAlignment: "center" };
summary.getRange("A4:B13").values = [
  ["Metric", "Value"],
  ["Canonical stories", rows.length],
  ["Baseline passed", null],
  ["Baseline failed", null],
  ["Regression passed", null],
  ["Regression local passed", null],
  ["Regression contract/unit passed", null],
  ["Regression unverified", null],
  ["Regression failed", null],
  ["Not yet regression-tested", null],
];
summary.getRange("B6").formulas = [[`=COUNTIF('User Stories'!$I$2:$I$${rows.length + 1},"Pass")`]];
summary.getRange("B7").formulas = [[`=COUNTIF('User Stories'!$I$2:$I$${rows.length + 1},"Fail")`]];
summary.getRange("B8").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${rows.length + 1},"Pass")`]];
summary.getRange("B9").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${rows.length + 1},"Local Pass")`]];
summary.getRange("B10").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${rows.length + 1},"Contract Pass")+COUNTIF('User Stories'!$N$2:$N$${rows.length + 1},"Unit Pass")`]];
summary.getRange("B11").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${rows.length + 1},"Unverified")`]];
summary.getRange("B12").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${rows.length + 1},"Fail")`]];
summary.getRange("B13").formulas = [[`=COUNTIF('User Stories'!$N$2:$N$${rows.length + 1},"Not Tested")`]];
summary.getRange("A4:B4").format = { fill: teal, font: { bold: true, color: "#FFFFFF" } };
summary.getRange("A4:B13").format.borders = { preset: "outside", style: "thin", color: line };
summary.getRange("A15:H18").values = [["Status notes", null, null, null, null, null, null, null],["Only a deployed-live evidence class may produce Pass. Local, contract/mock, unit, and undocumented runs remain visibly separate and cannot be counted as production proof. The Errors sheet records confirmed defects and fixes.",null,null,null,null,null,null,null],["Production URL","https://ai-model-analysis-dashboard.adamholter.chatgpt.site",null,null,null,null,null,null],["Evidence policy","Every merge stores class, target, command, run ID, and recorded time; missing metadata becomes Unverified.",null,null,null,null,null,null]];
summary.getRange("A15:H15").merge(); summary.getRange("A16:H16").merge(); summary.getRange("B17:H17").merge(); summary.getRange("B18:H18").merge();
summary.getRange("A15:H15").format = { fill: pale, font: { bold: true, color: navy } };
summary.getRange("A16:H18").format.wrapText = true;
summary.getRange("A1:H18").format.autofitRows();
summary.getRange("A:A").format.columnWidth = 30; summary.getRange("B:H").format.columnWidth = 18;

const headers = ["ID","Scope","Route / Surface","Feature","User Story","Expected Behavior","Code Evidence","Preconditions","Baseline Status","Baseline Evidence","Baseline Result","Errors","Fix Status","Regression Status","Regression Evidence","Regression Result"];
const matrix = rows.map(r => [r.id,r.scope,r.route,r.feature,r.user_story,r.expected_behavior,(r.evidence||[]).join("; "),r.preconditions,r.baseline_status,JSON.stringify(r.baseline_evidence||{}),r.baseline_result,(r.errors||[]).join(", "),r.fix_status,r.regression_status,JSON.stringify(r.regression_evidence||{}),r.regression_result].map(cleanCell));
stories.getRangeByIndexes(0,0,matrix.length+1,headers.length).values = [headers,...matrix];
stories.tables.add(`A1:P${matrix.length+1}`, true, "UserStoriesTable").style = "TableStyleMedium2";
stories.freezePanes.freezeRows(1); stories.freezePanes.freezeColumns(1); stories.showGridLines = false;
stories.getRange(`A1:P${matrix.length+1}`).format.wrapText = true;
stories.getRange("A:A").format.columnWidth = 18; stories.getRange("B:D").format.columnWidth = 20;
stories.getRange("E:F").format.columnWidth = 38; stories.getRange("G:H").format.columnWidth = 28;
stories.getRange("I:I").format.columnWidth = 16; stories.getRange("J:K").format.columnWidth = 38;
stories.getRange("L:N").format.columnWidth = 16; stories.getRange("O:P").format.columnWidth = 38;
const statusValues = ["Not Tested","Pass","Local Pass","Contract Pass","Unit Pass","Unverified","Fail","Blocked"];
stories.getRange(`I2:I${matrix.length+1}`).dataValidation = { rule: { type: "list", values: statusValues } };
stories.getRange(`M2:M${matrix.length+1}`).dataValidation = { rule: { type: "list", values: ["Not Started","In Progress","Fixed","Not Applicable"] } };
stories.getRange(`N2:N${matrix.length+1}`).dataValidation = { rule: { type: "list", values: statusValues } };
for (const col of ["I","N"]) {
  const range = stories.getRange(`${col}2:${col}${matrix.length+1}`);
  range.conditionalFormats.add("cellIs", { operator: "equal", formula: '"Pass"', format: { fill: "#DCFCE7", font: { color: "#166534", bold: true } } });
  range.conditionalFormats.add("containsText", { text: "Local Pass", format: { fill: "#DBEAFE", font: { color: "#1E40AF" } } });
  range.conditionalFormats.add("containsText", { text: "Contract Pass", format: { fill: "#FEF3C7", font: { color: "#92400E" } } });
  range.conditionalFormats.add("containsText", { text: "Unit Pass", format: { fill: "#F3E8FF", font: { color: "#6B21A8" } } });
  range.conditionalFormats.add("containsText", { text: "Unverified", format: { fill: "#F1F5F9", font: { color: "#475569", italic: true } } });
  range.conditionalFormats.add("containsText", { text: "Fail", format: { fill: "#FEE2E2", font: { color: "#991B1B" } } });
  range.conditionalFormats.add("containsText", { text: "Not Tested", format: { fill: "#F1F5F9", font: { color: "#475569" } } });
}

const errorRows = issues.map(i => [i.id,i.severity,i.surface,i.error,i.observed,i.root_cause,i.fix,i.fix_status,i.post_fix_status].map(cleanCell));
errors.getRangeByIndexes(0,0,errorRows.length+1,9).values = [["Error ID","Severity","Surface","Error","Observed behavior","Root cause","Fix","Fix status","Post-fix status"],...errorRows];
errors.tables.add(`A1:I${errorRows.length+1}`, true, "ErrorsTable").style = "TableStyleMedium2"; errors.freezePanes.freezeRows(1); errors.showGridLines = false;
errors.getRange(`A1:I${errorRows.length+1}`).format.wrapText = true; errors.getRange("A:A").format.columnWidth = 14; errors.getRange("B:C").format.columnWidth = 18; errors.getRange("D:G").format.columnWidth = 34; errors.getRange("H:I").format.columnWidth = 16;

const inspect = await wb.inspect({ kind: "table", range: `User Stories!A1:P${Math.min(rows.length+1,12)}`, include: "values,formulas", tableMaxRows: 12, tableMaxCols: 16 });
console.log(inspect.ndjson);
const formulaErrors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(formulaErrors.ndjson);
for (const sheetName of ["Summary","User Stories","Errors"]) {
  const preview = await wb.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName.toLowerCase().replace(/ /g,"-")}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(path.join(outputDir, "ai-dashboard-feature-status.xlsx"));
