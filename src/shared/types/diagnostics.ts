export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  message: string;
  filepath?: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: DiagnosticSeverity;
  code?: number;
}
