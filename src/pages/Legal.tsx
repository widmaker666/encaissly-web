import { useNavigate } from "react-router";
import { LEGAL_PARTS, LEGAL_UPDATED_AT } from "@/constants/legal";
import styles from "./Legal.module.css";

// Contenu dans constants/legal.ts (partagé à l'identique avec le mobile).

export default function Legal() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Retour">
          ‹
        </button>
        <div>
          <p className={styles.eyebrow}>Encaissly</p>
          <h1 className={styles.headerTitle}>Informations légales</h1>
        </div>
      </header>

      <div className={styles.content}>
        <p className={styles.lastUpdate}>Dernière mise à jour : {LEGAL_UPDATED_AT}</p>

        <nav className={styles.toc} aria-label="Sommaire">
          <p className={styles.tocTitle}>Sommaire</p>
          <ol>
            {LEGAL_PARTS.map((p) => (
              <li key={p.id}>
                <a href={`#${p.id}`}>{p.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        {LEGAL_PARTS.map((part) => (
          <section key={part.id} id={part.id} className={styles.part} aria-labelledby={`${part.id}-title`}>
            <h2 id={`${part.id}-title`} className={styles.partTitle}>{part.title}</h2>
            {part.intro && <p className={styles.partIntro}>{part.intro}</p>}
            {part.sections.map((s) => (
              <div key={s.title} className={styles.section}>
                <h3 className={styles.sectionTitle}>{s.title}</h3>
                <p className={styles.sectionBody}>{s.body}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
