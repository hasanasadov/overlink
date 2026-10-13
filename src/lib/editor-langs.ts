import type { Extension } from "@codemirror/state";
import type { CodeLanguage } from "./config";

// Language packs are loaded on demand so the editor bundle stays small.
export async function loadLanguage(id: string): Promise<Extension> {
  switch (id as CodeLanguage) {
    case "javascript": return (await import("@codemirror/lang-javascript")).javascript({ jsx: true });
    case "typescript": return (await import("@codemirror/lang-javascript")).javascript({ jsx: true, typescript: true });
    case "python": return (await import("@codemirror/lang-python")).python();
    case "html": return (await import("@codemirror/lang-html")).html();
    case "css": return (await import("@codemirror/lang-css")).css();
    case "json": return (await import("@codemirror/lang-json")).json();
    case "markdown": return (await import("@codemirror/lang-markdown")).markdown();
    case "java": return (await import("@codemirror/lang-java")).java();
    case "cpp": return (await import("@codemirror/lang-cpp")).cpp();
    case "rust": return (await import("@codemirror/lang-rust")).rust();
    case "go": return (await import("@codemirror/lang-go")).go();
    case "php": return (await import("@codemirror/lang-php")).php();
    case "sql": return (await import("@codemirror/lang-sql")).sql();
    case "xml": return (await import("@codemirror/lang-xml")).xml();
    case "yaml": return (await import("@codemirror/lang-yaml")).yaml();
    default: return [];
  }
}
