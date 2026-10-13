import { AUTHOR } from "@/lib/config";
import { getT } from "@/lib/i18n/server";

export async function Footer() {
  const { t } = await getT();
  return (
    <footer className="footer">
      <div className="container">
        <div>
          © {new Date().getFullYear()} <strong style={{ color: "var(--label)" }}>Overlink</strong> · {t("footer.privacyNote")}
        </div>
        <div>
          {t("footer.madeBy")}{" "}
          <a href={AUTHOR.url} target="_blank" rel="noopener author">
            {AUTHOR.name}
          </a>{" "}
          ·{" "}
          <a href={AUTHOR.url} target="_blank" rel="noopener author">
            {AUTHOR.label}
          </a>
        </div>
      </div>
    </footer>
  );
}
