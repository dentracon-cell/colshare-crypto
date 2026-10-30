// Ask kits (decisions.md 2026-10-19 "Ask kits that follow the law"): for one country and one use, the papers the
// official texts allow someone to ask for, and what they say may not be asked, each with its source and the date it was
// checked. An ask made from a kit carries its id (./link.ts `k`); the person asked sees what the kit allows. It is
// information, quoted or closely paraphrased from the official text, never advice. Each kit is also a page of the site
// (scripts/acte-truse.mjs → colshare-web/acte/<slug>/). Research notes: the papers app's session, 2026-10-19 (DILA's LEGI
// dump for the French texts, the DSK's own PDF for the German guidance).
import type { Limba } from "./limba.ts";

/** The languages the kits are written in; any other reads them in English. */
export type LimbaTrusa = "en" | "ro" | "de" | "fr";
export const LIMBI_TRUSE: LimbaTrusa[] = ["en", "ro", "de", "fr"];
export const limbaTrusa = (l: Limba): LimbaTrusa => ((LIMBI_TRUSE as Limba[]).includes(l) ? l as LimbaTrusa : "en");
type T = Record<LimbaTrusa, string>;

export interface ElementTrusa {
  t: T;
  /** The official wording of the item, in the text's language, where a short quote helps. */
  o?: string;
}

export interface GrupTrusa {
  titlu: T;
  /** "one of", "one or more": how many the text asks for. */
  cate?: T;
  elemente: ElementTrusa[];
}

/**
 * What a source says of its version, and the date (YYYY-MM-DD, or YYYY-MM where it gives only a month), written in the
 * page's language by ./truse-html.ts: "modificat" last amended, "vigoare" in force since, "verificat" the page's own
 * "checked on", "publicat", "actualizat" updated, "adoptat", "stand" as of (a German "Stand"), "data" a bare date,
 * "fara" no date shown, "nemodificat" never amended since.
 */
export type FelVersiune = "modificat" | "vigoare" | "verificat" | "publicat" | "actualizat" | "adoptat" | "stand" | "data" | "fara" | "nemodificat";
/** One step of a version line: a kind and its date, words in the four languages, or a reference kept as it is ("décret n° 2022-1014"). */
export type PasVersiune = [FelVersiune, string?] | T | string;

export interface SursaTrusa {
  /** The official title, in the source's own language. */
  titlu: string;
  /** What the cited part is about, in the page's language, after the title in brackets. */
  despre?: T;
  url: string;
  /** Its version, as the source states it. */
  versiune: PasVersiune[];
}

export interface Trusa {
  id: "fr-chirie" | "de-chirie" | "fr-cont" | "de-cont" | "fr-angajare" | "de-angajare";
  /** Short, for the ask sheet's list. */
  scurt: T;
  titlu: T;
  /** The site page's address, per language (under /acte/). */
  pagina: T;
  /** A few short sentences: what kind of rule it is. */
  regula: T;
  /** The page's meta description: one sentence, under about 160 characters. */
  descriere: T;
  /** The groups of what may be asked, in the order the text gives them (stages, for Germany). */
  permise: { sectiune: T; grupuri: GrupTrusa[] }[];
  /** What may not be asked. */
  interzise: { titlu: T; elemente: ElementTrusa[] };
  /** What an ask made from the kit lists, one line each. */
  cerute: T[];
  surse: SursaTrusa[];
  verificat: string;
  /**
   * The site page invites to a safe copy of the ID: only where the kit's own texts allow the copy (French renting).
   * Never on a kit that says a copy is not allowed (German renting: DSK, "unzulässig").
   */
  copie?: true;
  /** The site page says Colshare blacks out what is not needed on proof of income: where the kit asks for exactly that. */
  negru?: true;
}

const t = (en: string, ro: string, de: string, fr: string): T => ({ en, ro, de, fr });
const N = " ";

const FR: Trusa = {
  id: "fr-chirie",
  scurt: t("Renting in France", "Chirie în Franța", "Mieten in Frankreich", "Location en France"),
  titlu: t("Renting a home in France: the papers a landlord may ask for", "Chirie în Franța: actele pe care le poate cere proprietarul",
    "Mieten in Frankreich: was der Vermieter verlangen darf", `Louer un logement${N}: les pièces que le bailleur peut demander`),
  pagina: t("papers-landlord-may-ask-france", "acte-cerute-chirie-franta", "unterlagen-vermieter-frankreich", "pieces-bailleur-location"),
  regula: t(
    "The list is closed. Before the lease, a private landlord may require from you, and from your guarantor, only the papers on the list set by decree. A landlord who asks for others can be fined by the préfet: up to €3,000 for a person, €15,000 for a company. The papers may be copies; the landlord may ask to see the originals.",
    "Lista e închisă. Înainte de contract, un proprietar privat vă poate cere dumneavoastră și garantului dumneavoastră doar actele de pe lista stabilită prin decret. Dacă cere altele, poate primi o amendă de la prefect: până la 3.000 € pentru o persoană, 15.000 € pentru o firmă. Actele pot fi copii; proprietarul poate cere să vadă originalele.",
    "Die Liste ist abschließend. Vor dem Mietvertrag darf ein privater Vermieter von Ihnen und Ihrem Bürgen nur die Unterlagen verlangen, die eine Verordnung aufzählt. Wer andere verlangt, riskiert ein Bußgeld des Präfekten: bis zu 3.000 € für Personen, 15.000 € für Unternehmen. Kopien genügen; der Vermieter darf verlangen, die Originale zu sehen.",
    `La liste est limitative. Avant le bail, un bailleur privé ne peut exiger de vous et de votre caution que les pièces de la liste fixée par décret. En exiger d’autres expose à une amende administrative du préfet${N}: jusqu’à 3${N}000${N}€ pour une personne physique, 15${N}000${N}€ pour une personne morale. Les pièces peuvent être des copies${N}; le bailleur peut demander à voir les originaux.`),
  descriere: t(
    "Before the lease, a landlord in France may ask you and your guarantor only for the papers on a list set by decree. The list, with its sources.",
    "Înainte de contract, un proprietar din Franța vă poate cere dumneavoastră și garantului doar actele de pe o listă stabilită prin decret. Lista, cu sursele ei.",
    "Vor dem Mietvertrag darf ein Vermieter in Frankreich von Ihnen und Ihrem Bürgen nur die Unterlagen einer amtlichen Liste verlangen. Die Liste, mit Quellen.",
    `Avant le bail, le bailleur ne peut exiger de vous et de votre caution que les pièces d’une liste fixée par décret. La liste, avec ses sources.`),
  permise: [
    {
      sectiune: t("From you, the candidate tenant", "De la candidatul la chirie", "Vom Mietinteressenten", "Du candidat locataire"),
      grupuri: [
        { titlu: t("Identity", "Identitate", "Identität", "Identité"), cate: t("one, valid, with a photo", "unul, valabil, cu fotografie", "eines, gültig, mit Lichtbild", "une, en cours de validité, avec photographie"), elemente: [
          { t: t("ID card, French or foreign", "carte de identitate, franceză sau străină", "Personalausweis, französisch oder ausländisch", "carte nationale d’identité française ou étrangère") },
          { t: t("passport, French or foreign", "pașaport, francez sau străin", "Reisepass, französisch oder ausländisch", "passeport français ou étranger") },
          { t: t("driving licence, French or foreign", "permis de conducere, francez sau străin", "Führerschein, französisch oder ausländisch", "permis de conduire français ou étranger") },
          { t: t("if you are a foreign national, a residence permit or EU/EEA residence card", "pentru un candidat străin, un permis de ședere sau cartea de rezident UE/SEE", "für ausländische Bewerber: Aufenthaltstitel oder EU/EWR-Aufenthaltskarte", "pour un candidat étranger, un document justifiant du droit au séjour (carte de séjour, carte de résident, carte de ressortissant UE/EEE)") },
        ] },
        { titlu: t("Home address", "Domiciliu", "Wohnsitz", "Domicile"), cate: t("only one", "doar unul", "nur einer", "une seule pièce"), elemente: [
          { t: t("your last three rent receipts, or else the previous landlord's statement that rent is paid up", "ultimele trei chitanțe de chirie sau, în lipsă, declarația fostului proprietar că chiria e plătită", "die letzten drei Mietquittungen oder ersatzweise die Bestätigung des früheren Vermieters, dass die Miete bezahlt ist", "les trois dernières quittances de loyer ou, à défaut, l’attestation du précédent bailleur") },
          { t: t("a certificate of postal address from an approved body", "o adeverință de domiciliu poștal de la un organism autorizat", "eine Postanschriftsbescheinigung einer zugelassenen Stelle", "une attestation d’élection de domicile") },
          { t: t("your host's sworn statement that you live with them", "declarația pe proprie răspundere a gazdei că locuiți la ea", "die eidesstattliche Erklärung des Gastgebers, dass der Bewerber bei ihm wohnt", "une attestation sur l’honneur de l’hébergeant") },
          { t: t("the last property tax notice, or else the title deed of the main home", "ultima înștiințare de impozit pe proprietate sau, în lipsă, actul de proprietate al locuinței", "der letzte Grundsteuerbescheid oder ersatzweise der Eigentumsnachweis der Hauptwohnung", "le dernier avis de taxe foncière ou, à défaut, le titre de propriété de la résidence principale") },
        ] },
        { titlu: t("Work or studies", "Muncă sau studii", "Beruf oder Studium", "Activité professionnelle ou études"), cate: t("one or more", "unul sau mai multe", "eines oder mehrere", "une ou plusieurs pièces"), elemente: [
          { t: t("employment or internship contract, or else the employer's statement (job, pay, start date, trial period)", "contractul de muncă sau de stagiu ori, în lipsă, adeverința angajatorului (post, salariu, data începerii, perioada de probă)", "Arbeits- oder Praktikumsvertrag oder ersatzweise eine Arbeitgeberbescheinigung (Stelle, Vergütung, Beginn, Probezeit)", "le contrat de travail ou de stage ou, à défaut, une attestation de l’employeur") },
          { t: t("for a business: company register extract (K or K bis) or national business register record, under three months old", "pentru o firmă: extras din registrul comerțului (K sau K bis) ori fișa din registrul național al întreprinderilor, mai noi de trei luni", "für Unternehmer: Handelsregisterauszug (K oder K bis) oder Eintrag im nationalen Unternehmensregister, nicht älter als drei Monate", "l’extrait K ou K bis du RCS, ou la fiche d’immatriculation au Registre national des entreprises, de moins de trois mois") },
          { t: t("for the self-employed: the INSEE identification certificate or the professional card", "pentru independenți: certificatul de identificare INSEE sau legitimația profesională", "für Selbständige: INSEE-Identifikationsbescheinigung oder Berufsausweis", "la copie du certificat d’identification de l’INSEE ou de la carte professionnelle") },
          { t: t("any recent paper proving the work, for other professionals", "orice act recent care dovedește activitatea, pentru alți profesioniști", "jeder aktuelle Nachweis der Tätigkeit, für andere Berufe", "toute pièce récente attestant de l’activité pour les autres professionnels") },
          { t: t("student card or certificate of enrolment for the current year", "carnetul de student sau adeverința de școlarizare pe anul în curs", "Studierendenausweis oder Immatrikulationsbescheinigung für das laufende Jahr", "la carte d’étudiant ou le certificat de scolarité pour l’année en cours") },
        ] },
        { titlu: t("Income", "Venituri", "Einkommen", "Ressources"), cate: t("one or more", "unul sau mai multe", "eines oder mehrere", "une ou plusieurs pièces"), elemente: [
          { t: t("the last or second-to-last income tax notice (or the foreign equivalent)", "ultima sau penultima decizie de impunere (sau echivalentul străin)", "der letzte oder vorletzte Steuerbescheid (oder das ausländische Gegenstück)", "le dernier ou avant-dernier avis d’imposition ou de non-imposition") },
          { t: t("the last three payslips", "ultimii trei fluturași de salariu", "die letzten drei Gehaltsabrechnungen", "les trois derniers bulletins de salaire") },
          { t: t("proof of internship pay", "dovada indemnizației de stagiu", "Nachweis der Praktikumsvergütung", "un justificatif de versement des indemnités de stage") },
          { t: t("for the self-employed: the last two balance sheets, or an accountant's statement of income", "pentru independenți: ultimele două bilanțuri sau o adeverință de venit de la contabil", "für Selbständige: die letzten zwei Bilanzen oder eine Einkommensbescheinigung des Steuerberaters", "les deux derniers bilans ou, à défaut, une attestation de ressources établie par un expert-comptable") },
          { t: t("proof of benefits, pensions or allowances for the last three months", "dovada prestațiilor, pensiilor sau alocațiilor din ultimele trei luni", "Nachweis von Sozialleistungen, Renten oder Beihilfen der letzten drei Monate", "un justificatif du versement des prestations sociales et familiales et allocations perçues lors des trois derniers mois") },
          { t: t("a housing-aid estimate", "o simulare a ajutorului pentru locuință", "eine Berechnung des Wohngelds", "l’avis d’attribution ou une simulation des aides au logement") },
          { t: t("a study grant notice", "decizia de acordare a bursei", "ein Stipendienbescheid", "l’avis d’attribution de bourse") },
          { t: t("a title deed or the last property tax notice", "un act de proprietate sau ultima înștiințare de impozit pe proprietate", "ein Eigentumsnachweis oder der letzte Grundsteuerbescheid", "le titre de propriété d’un bien immobilier ou le dernier avis de taxe foncière") },
          { t: t("proof of income from property, life annuities or securities", "dovada veniturilor din chirii, rente viagere sau valori mobiliare", "Nachweis von Einkünften aus Vermietung, Leibrenten oder Wertpapieren", "un justificatif de revenus fonciers, de rentes viagères ou de revenus de valeurs et capitaux mobiliers") },
        ] },
      ],
    },
    {
      sectiune: t("From your guarantor (a person)", "De la un garant (persoană)", "Vom Bürgen (Person)", "De la caution (personne physique)"),
      grupuri: [
        { titlu: t("Identity", "Identitate", "Identität", "Identité"), cate: t("one, valid, with a photo", "unul, valabil, cu fotografie", "eines, gültig, mit Lichtbild", "une, en cours de validité, avec photographie"), elemente: [
          { t: t("ID card, passport or driving licence, French or foreign", "carte de identitate, pașaport sau permis de conducere, francez ori străin", "Personalausweis, Reisepass oder Führerschein, französisch oder ausländisch", "carte nationale d’identité, passeport ou permis de conduire, français ou étranger") },
        ] },
        { titlu: t("Home address", "Domiciliu", "Wohnsitz", "Domicile"), cate: t("only one", "doar unul", "nur einer", "une seule pièce"), elemente: [
          { t: t("the last rent receipt", "ultima chitanță de chirie", "die letzte Mietquittung", "la dernière quittance de loyer") },
          { t: t("a water, gas or electricity bill under three months old", "o factură de apă, gaz sau curent mai nouă de trei luni", "eine Wasser-, Gas- oder Stromrechnung, nicht älter als drei Monate", "une facture d’eau, de gaz ou d’électricité de moins de trois mois") },
          { t: t("a home insurance certificate under three months old", "o poliță de asigurare a locuinței mai nouă de trei luni", "eine Wohngebäude- oder Hausratversicherungsbescheinigung, nicht älter als drei Monate", "une attestation d’assurance logement de moins de trois mois") },
          { t: t("the last property tax notice, or else the title deed", "ultima înștiințare de impozit pe proprietate sau, în lipsă, actul de proprietate", "der letzte Grundsteuerbescheid oder ersatzweise der Eigentumsnachweis", "le dernier avis de taxe foncière ou, à défaut, le titre de propriété") },
        ] },
        { titlu: t("Work", "Activitate profesională", "Berufliche Tätigkeit", "Activité professionnelle"), cate: t("one or more", "unul sau mai multe", "eines oder mehrere", "une ou plusieurs pièces"), elemente: [
          { t: t("the same papers as yours, without the student card", "aceleași acte ca ale candidatului, fără carnetul de student", "dieselben Unterlagen wie beim Bewerber, ohne Studierendenausweis", "les mêmes pièces que le candidat, sauf la carte d’étudiant") },
        ] },
        { titlu: t("Income", "Venituri", "Einkommen", "Ressources"), cate: t("one or more", "unul sau mai multe", "eines oder mehrere", "une ou plusieurs pièces"), elemente: [
          { t: t("the last income tax notice", "ultima decizie de impunere", "der letzte Steuerbescheid", "le dernier avis d’imposition ou de non-imposition") },
          { t: t("the last three payslips", "ultimii trei fluturași de salariu", "die letzten drei Gehaltsabrechnungen", "les trois derniers bulletins de salaire") },
          { t: t("a title deed or the last property tax notice", "un act de proprietate sau ultima înștiințare de impozit pe proprietate", "ein Eigentumsnachweis oder der letzte Grundsteuerbescheid", "le titre de propriété d’un bien immobilier ou le dernier avis de taxe foncière") },
          { t: t("for the self-employed: the last two balance sheets, or an accountant's statement of income", "pentru independenți: ultimele două bilanțuri sau o adeverință de venit de la contabil", "für Selbständige: die letzten zwei Bilanzen oder eine Einkommensbescheinigung des Steuerberaters", "les deux derniers bilans ou une attestation de ressources établie par un expert-comptable") },
          { t: t("proof of benefits, pensions or allowances for the last three months", "dovada prestațiilor, pensiilor sau alocațiilor din ultimele trei luni", "Nachweis von Sozialleistungen, Renten oder Beihilfen der letzten drei Monate", "un justificatif des prestations, pensions ou allocations des trois derniers mois") },
          { t: t("proof of income from property, life annuities or securities", "dovada veniturilor din chirii, rente viagere sau valori mobiliare", "Nachweis von Einkünften aus Vermietung, Leibrenten oder Wertpapieren", "un justificatif de revenus fonciers, de rentes viagères ou de valeurs mobilières") },
        ] },
      ],
    },
  ],
  interzise: {
    titlu: t("What may not be required", "Ce nu poate fi cerut", "Was nicht verlangt werden darf", "Ce qui ne peut pas être exigé"),
    elemente: [
      { t: t("any paper that is not on the list above: for example a bank statement, a photo of you, a medical file or a criminal record extract", "orice act care nu e pe lista de mai sus: de exemplu un extras de cont, o fotografie a candidatului, un dosar medical sau un cazier judiciar", "jede Unterlage, die nicht auf der Liste oben steht: zum Beispiel ein Kontoauszug, ein Foto des Bewerbers, Krankenunterlagen oder ein Führungszeugnis", `toute pièce qui ne figure pas sur la liste ci-dessus${N}: par exemple un relevé de compte, une photo du candidat, un dossier médical ou un extrait de casier judiciaire`), o: "Le propriétaire a interdiction d’en exiger d’autres." },
      { t: t("that your parent or child co-sign", "ca un părinte sau un copil al candidatului să semneze și el", "dass ein Elternteil oder Kind des Bewerbers mitunterschreibt", "la cosignature d’un ascendant ou d’un descendant du candidat"), o: "ne peut imposer la cosignature d’un ascendant ou d’un descendant du candidat" },
    ],
  },
  cerute: [
    t("ID with a photo (ID card, passport, driving licence or residence permit)", "Act de identitate cu fotografie (carte de identitate, pașaport, permis de conducere sau permis de ședere)", "Ausweis mit Lichtbild (Personalausweis, Reisepass, Führerschein oder Aufenthaltstitel)", "Pièce d’identité avec photo (carte d’identité, passeport, permis de conduire ou titre de séjour)"),
    t("One proof of address (last three rent receipts, or your host's statement…)", "O dovadă de domiciliu (ultimele trei chitanțe de chirie sau declarația gazdei…)", "Ein Wohnsitznachweis (letzte drei Mietquittungen oder Erklärung des Gastgebers …)", "Un justificatif de domicile (trois dernières quittances de loyer, attestation d’hébergement…)"),
    t("Proof of work or studies (contract, employer's statement, student card…)", "Dovada activității (contract, adeverință de la angajator, carnet de student…)", "Nachweis der Tätigkeit (Vertrag, Arbeitgeberbescheinigung, Studierendenausweis …)", "Justificatif d’activité (contrat, attestation employeur, carte d’étudiant…)"),
    t("Proof of income (last three payslips, tax notice…)", "Dovada veniturilor (ultimii trei fluturași, decizia de impunere…)", "Einkommensnachweis (letzte drei Gehaltsabrechnungen, Steuerbescheid …)", "Justificatif de ressources (trois derniers bulletins de salaire, avis d’imposition…)"),
  ],
  surse: [
    { titlu: "Décret n° 2015-1437 du 5 novembre 2015, annexes I et II (consolidées)", url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000031444493", versiune: [["modificat", "2023-01-01"], "décret n° 2022-1014"] },
    { titlu: "Loi n° 89-462 du 6 juillet 1989, article 22-2", url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000028806691/", versiune: [["vigoare", "2014-03-27"], "loi n° 2014-366"] },
    { titlu: "Service-public.gouv.fr, « Futur locataire d’un logement privé : justificatifs à donner au propriétaire »", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1169", versiune: [["verificat", "2025-04-10"]] },
  ],
  verificat: "2026-10-19",
  copie: true,
};

const DE: Trusa = {
  id: "de-chirie",
  scurt: t("Renting in Germany", "Chirie în Germania", "Mieten in Deutschland", "Location en Allemagne"),
  titlu: t("Renting in Germany: what a landlord may ask for, and when", "Închiriere în Germania: ce poate cere proprietarul și când",
    "Wohnung mieten: was Vermieter verlangen dürfen, und wann", `Louer en Allemagne${N}: ce que le bailleur peut demander`),
  pagina: t("papers-landlord-may-ask-germany", "acte-cerute-chirie-germania", "unterlagen-vermieter-mietinteressenten", "pieces-bailleur-allemagne"),
  regula: t(
    "Guidance of Germany's data protection authorities, under the GDPR: what a landlord may ask depends on the stage. The landlord may see your ID, but may not copy it. Questions that are not allowed need not be answered.",
    "Ghidul autorităților germane de protecție a datelor, potrivit GDPR: ce poate cere proprietarul depinde de etapă. Buletinul se poate arăta, dar nu poate fi copiat. La întrebările nepermise nu trebuie să răspundeți.",
    "Orientierungshilfe der Datenschutzkonferenz nach der DSGVO: Was Vermieter fragen dürfen, hängt von der Phase ab. Der Ausweis darf vorgezeigt, aber nicht kopiert werden. Unzulässige Fragen müssen nicht beantwortet werden.",
    `Lignes directrices des autorités allemandes de protection des données, au titre du RGPD${N}: ce que le bailleur peut demander dépend de l’étape. Le bailleur peut voir votre pièce d’identité, mais pas la copier. Il n’est pas nécessaire de répondre aux questions non permises.`),
  descriere: t(
    "What a landlord in Germany may ask you at each stage, under the data protection authorities' guidance, and what not: your ID may be shown, not copied.",
    "Ce vă poate cere un proprietar din Germania la fiecare etapă, după autoritățile de protecție a datelor, și ce nu: buletinul se arată, nu se copiază.",
    "Was Vermieter in jeder Phase fragen dürfen, nach der Datenschutzkonferenz, und was nicht: Den Ausweis dürfen sie sehen, aber nicht kopieren.",
    `Ce qu’un bailleur en Allemagne peut vous demander à chaque étape, selon les autorités de protection des données. La pièce d’identité se montre, sans copie.`),
  permise: [
    {
      sectiune: t("At the viewing", "La vizionare", "Beim Besichtigungstermin", "À la visite"),
      grupuri: [{ titlu: t("May be asked", "Se poate cere", "Darf erfragt werden", "Peut être demandé"), elemente: [
        { t: t("name, first name and address", "numele, prenumele și adresa", "Name, Vorname und Anschrift", "nom, prénom et adresse") },
        { t: t("one way to reach you: phone or e-mail (more is up to you)", "un mod de a vă contacta: telefon sau e-mail (mai mult doar dacă doriți)", "eine Kontaktmöglichkeit: Telefon oder E-Mail (mehr ist freiwillig)", `un moyen de vous joindre${N}: téléphone ou e-mail (davantage est facultatif)`) },
        { t: t("if you view alone, seeing your ID card to check these details; a copy of it is not allowed", "dacă vizionați singur, să vă vadă buletinul ca să verifice aceste date; o copie nu e permisă", "bei einer Einzelbesichtigung das Vorzeigen des Personalausweises zur Prüfung; eine Kopie ist unzulässig", `en cas de visite individuelle, voir votre carte d’identité pour vérifier ces données${N}; une copie n’est pas permise`), o: "Das Anfertigen einer Ausweiskopie ist nicht erforderlich und damit unzulässig." },
        { t: t("for social housing: whether you have a housing entitlement certificate (WBS), its floor area and rooms", "pentru locuințe sociale: dacă aveți certificat de locuință socială (WBS), cu suprafața și camerele lui", "bei gefördertem Wohnraum: ob ein Wohnberechtigungsschein vorliegt, mit Fläche und Zimmerzahl", `pour un logement social${N}: si vous avez un certificat d’éligibilité (WBS), avec sa surface et ses pièces`) },
      ] }],
    },
    {
      sectiune: t("Once you say you want to rent", "După ce spuneți că doriți să închiriați", "Nach Bekundung des Mietinteresses", "Une fois que vous dites vouloir louer"),
      grupuri: [{ titlu: t("May be asked", "Se poate cere", "Darf erfragt werden", "Peut être demandé"), elemente: [
        { t: t("how many people will move in, adults or children", "câte persoane se mută, adulți sau copii", "Zahl der einziehenden Personen, Erwachsene oder Kinder", "combien de personnes emménagent, adultes ou enfants") },
        { t: t("the housing entitlement certificate (WBS) itself", "certificatul de locuință socială (WBS)", "der Wohnberechtigungsschein selbst", "le certificat d’éligibilité au logement social (WBS)") },
        { t: t("current employer and occupation", "angajatorul și profesia actuale", "derzeitiger Arbeitgeber und Beruf", "l’employeur et la profession actuels") },
        { t: t("net income, or what is left after monthly charges, or simply yes or no to “at least X a month”", "venitul net, sau ce rămâne după cheltuielile lunare, ori doar da sau nu la „cel puțin X pe lună”", "Nettoeinkommen, oder was nach monatlichen Belastungen bleibt, oder nur ja oder nein zu „mindestens X im Monat“", `le revenu net, ou ce qui reste après les charges mensuelles, ou seulement oui ou non à «${N}au moins X par mois${N}»`) },
        { t: t("pets, except small caged animals", "animale de companie, în afară de cele mici, ținute în cușcă", "Haustiere, außer Kleintieren in Käfigen", "les animaux, sauf les petits animaux en cage") },
        { t: t("an insolvency procedure not yet finished", "o procedură de insolvență încă nefinalizată", "ein laufendes Insolvenzverfahren", "une procédure d’insolvabilité en cours") },
        { t: t("an eviction order in the last five years", "o hotărâre de evacuare în ultimii cinci ani", "ein Räumungstitel in den letzten fünf Jahren", "une décision d’expulsion dans les cinq dernières années") },
      ] }],
    },
    {
      sectiune: t("Once the landlord has chosen you, before signing", "După ce proprietarul v-a ales, înainte de semnare", "Nach der Auswahl, unmittelbar vor Vertragsschluss", "Une fois que le bailleur vous a choisi, avant la signature"),
      grupuri: [{ titlu: t("May be asked", "Se poate cere", "Darf verlangt werden", "Peut être demandé"), elemente: [
        { t: t("proof of income as a copy, with the details not needed blacked out: payslip, bank statement or tax assessment", "dovada venitului, în copie, cu datele care nu sunt necesare acoperite: fluturaș de salariu, extras de cont sau decizie de impunere", "Einkommensnachweis in Kopie, mit geschwärzten nicht erforderlichen Angaben: Gehaltsabrechnung, Kontoauszug oder Steuerbescheid", `un justificatif de revenus en copie, les données non nécessaires masquées${N}: bulletin de salaire, relevé de compte ou avis d’imposition`), o: "unter Schwärzung der nicht erforderlichen Angaben" },
        { t: t("a credit report you get yourself, made for renting (not a credit bureau's full self-disclosure)", "un raport de credit pe care îl obțineți dumneavoastră, făcut pentru închiriere (nu raportul complet al biroului de credit)", "eine selbst eingeholte, für die Anmietung bestimmte Bonitätsauskunft (nicht die vollständige Datenkopie nach Art. 15 DSGVO)", "un rapport de solvabilité que vous obtenez vous-même, fait pour la location (pas la copie complète des données d’un bureau de crédit)") },
        { t: t("proof that a public body pays the rent, where one does", "dovada că o instituție publică plătește chiria, dacă e cazul", "Nachweis, dass eine öffentliche Stelle die Miete zahlt, falls zutreffend", "la preuve qu’un organisme public paie le loyer, le cas échéant") },
      ] }],
    },
  ],
  interzise: {
    titlu: t("May not be asked", "Nu se poate cere", "Darf nicht gefragt werden", "Ne peut pas être demandé"),
    elemente: [
      { t: t("a copy of the ID card", "o copie a buletinului", "eine Kopie des Personalausweises", "une copie de la carte d’identité"), o: "Personalausweiskopien … sind unzulässig" },
      { t: t("marital status", "starea civilă", "Familienstand", "la situation familiale") },
      { t: t("nationality, religion, ethnic origin", "cetățenia, religia, originea etnică", "Staatsangehörigkeit, Religion, ethnische Herkunft", "la nationalité, la religion, l’origine ethnique") },
      { t: t("criminal record or current investigations", "cazierul sau anchete în curs", "Vorstrafen oder laufende Ermittlungsverfahren", "le casier judiciaire ou les enquêtes en cours") },
      { t: t("plans to marry, pregnancy, wanting children", "planuri de căsătorie, sarcină, dorința de a avea copii", "Heiratsabsichten, Schwangerschaften, Kinderwünsche", "projets de mariage, grossesse, désir d’enfant") },
      { t: t("membership of a party or a tenants' association", "apartenența la un partid sau la o asociație de chiriași", "Mitgliedschaft in einer Partei oder einem Mieterverein", "l’appartenance à un parti ou à une association de locataires") },
      { t: t("how long you have been employed, or what your monthly charges are for", "de cât timp lucrați sau pentru ce sunt cheltuielile dumneavoastră lunare", "Dauer des Arbeitsverhältnisses oder Gründe monatlicher Belastungen", "l’ancienneté dans votre emploi, ou l’objet de vos charges mensuelles") },
      { t: t("previous landlords' contact details, or a certificate of no rent arrears", "datele de contact ale foștilor proprietari sau o adeverință că nu aveți datorii la chirie", "Kontaktdaten früherer Vermieter oder eine Mietschuldenfreiheitsbescheinigung", "les coordonnées des anciens bailleurs ou une attestation d’absence de dettes de loyer") },
    ],
  },
  cerute: [
    t("Proof of income, details not needed blacked out (payslip, bank statement or tax assessment)", "Dovada venitului, cu datele care nu sunt necesare acoperite (fluturaș, extras de cont sau decizie de impunere)", "Einkommensnachweis, nicht erforderliche Angaben geschwärzt (Gehaltsabrechnung, Kontoauszug oder Steuerbescheid)", "Justificatif de revenus, données non nécessaires masquées (bulletin de salaire, relevé ou avis d’imposition)"),
    t("Credit report made for renting", "Raport de credit făcut pentru închiriere", "Bonitätsauskunft für die Anmietung", "Rapport de solvabilité fait pour la location"),
    t("Proof that a public body pays the rent (if it does)", "Dovada că o instituție publică plătește chiria (dacă e cazul)", "Nachweis, dass eine öffentliche Stelle die Miete zahlt (falls zutreffend)", "Preuve qu’un organisme public paie le loyer (le cas échéant)"),
  ],
  surse: [
    { titlu: "Datenschutzkonferenz, Orientierungshilfe zur Einholung von Selbstauskünften bei Mietinteressent:innen, Version 2.0", url: "https://www.datenschutzkonferenz-online.de/media/oh/OH_Einholung_von_Selbstauskuenften_Mietinteressenten_V2.pdf", versiune: [["stand", "2026-01"], ["publicat", "2026-03"]] },
    { titlu: "Personalausweisgesetz, § 20", despre: t("copies of the ID card", "copiile buletinului", "Ausweiskopien", "copies de la carte d’identité"), url: "https://www.gesetze-im-internet.de/pauswg/__20.html", versiune: [["modificat", "2026-07-16"]] },
  ],
  verificat: "2026-10-19",
  negru: true,
};

// Research notes for the kits below: the papers app's session, 2026-10-20 (kits-research-*.md). The German laws as
// gesetze-im-internet.de shows them; the Code du travail as code.travail.gouv.fr shows it (Légifrance refuses
// automated reads); the CNIL's and the German authorities' own PDFs.

const DE_CONT: Trusa = {
  id: "de-cont",
  scurt: t("Bank account in Germany", "Cont bancar în Germania", "Bankkonto in Deutschland", "Compte bancaire en Allemagne"),
  titlu: t("A bank account in Germany: what the bank asks for, by law", "Cont bancar în Germania: ce cere banca, după lege",
    "Konto eröffnen: welche Unterlagen die Bank verlangt", `Compte en Allemagne${N}: ce que la banque demande, selon la loi`),
  pagina: t("papers-bank-account-germany", "acte-cont-bancar-germania", "unterlagen-kontoeroeffnung", "pieces-compte-bancaire-allemagne"),
  regula: t(
    "The anti-money-laundering law sets it. Before opening an account, a bank must record your name, place and date of birth, nationality and address, and check them on an official ID with a photo, which it has the right and the duty to copy. It may use these data only to prevent money laundering and terrorist financing. It must also record your tax ID and ask where you are resident for tax. Anyone lawfully in the EU, with or without a fixed address, is entitled to a basic account.",
    "Legea împotriva spălării banilor o stabilește. Înainte de a deschide un cont, banca trebuie să vă noteze numele, locul și data nașterii, cetățenia și adresa și să le verifice pe un act de identitate oficial cu fotografie, pe care are dreptul și obligația să-l copieze. Aceste date le poate folosi doar pentru prevenirea spălării banilor și a finanțării terorismului. Trebuie să noteze și codul de identificare fiscală și să vă întrebe unde sunteți rezident fiscal. Oricine stă legal în UE, cu sau fără domiciliu stabil, are dreptul la un cont de bază.",
    "Das Geldwäschegesetz legt es fest. Vor der Kontoeröffnung muss die Bank Namen, Geburtsort und -datum, Staatsangehörigkeit und Anschrift erheben und anhand eines amtlichen Lichtbildausweises prüfen, den sie kopieren darf und muss. Diese Daten darf sie nur zur Verhinderung von Geldwäsche und Terrorismusfinanzierung verarbeiten. Sie muss auch die steuerliche Identifikationsnummer erfassen und die steuerliche Ansässigkeit erfragen. Wer sich rechtmäßig in der EU aufhält, auch ohne festen Wohnsitz, hat Anspruch auf ein Basiskonto.",
    `La loi contre le blanchiment le fixe. Avant d’ouvrir un compte, la banque doit relever vos nom, lieu et date de naissance, nationalité et adresse, et les vérifier sur une pièce d’identité officielle avec photo, qu’elle a le droit et l’obligation de copier. Elle ne peut utiliser ces données que pour prévenir le blanchiment et le financement du terrorisme. Elle doit aussi relever votre numéro d’identification fiscale et vous demander votre résidence fiscale. Toute personne en séjour régulier dans l’UE, avec ou sans domicile fixe, a droit à un compte de base.`),
  descriere: t(
    "What a bank in Germany must record and check before opening an account, under the anti-money-laundering law, and your right to a basic account.",
    "Ce notează și verifică o bancă din Germania înainte de a deschide un cont, după legea împotriva spălării banilor, și dreptul dumneavoastră la un cont de bază.",
    "Was die Bank vor der Kontoeröffnung nach dem Geldwäschegesetz erheben und prüfen muss, und Ihr Anspruch auf ein Basiskonto.",
    `Ce qu’une banque en Allemagne doit relever et vérifier avant d’ouvrir un compte, selon la loi contre le blanchiment, et votre droit à un compte de base.`),
  permise: [
    {
      sectiune: t("What the bank records", "Ce notează banca", "Was die Bank erhebt", "Ce que la banque relève"),
      grupuri: [{ titlu: t("About you", "Despre dumneavoastră", "Zur Person", "Sur vous"), cate: t("all of them", "toate", "alle", "toutes"), elemente: [
        { t: t("first names and surname", "prenumele și numele", "Vorname und Nachname", "prénoms et nom"), o: "Vorname und Nachname" },
        { t: t("place and date of birth", "locul și data nașterii", "Geburtsort und Geburtsdatum", "lieu et date de naissance") },
        { t: t("nationality", "cetățenia", "Staatsangehörigkeit", "nationalité") },
        { t: t("your home address; for a basic account without a fixed home, a postal address", "adresa de domiciliu; pentru un cont de bază fără domiciliu stabil, o adresă poștală", "Wohnanschrift; beim Basiskonto ohne festen Wohnsitz die postalische Anschrift", `l’adresse du domicile${N}; pour un compte de base sans domicile fixe, une adresse postale`), o: "eine Wohnanschrift" },
      ] }],
    },
    {
      sectiune: t("What proves who you are", "Cu ce vă dovediți identitatea", "Womit die Identität überprüft wird", "Ce qui prouve votre identité"),
      grupuri: [
        { titlu: t("Identity", "Identitate", "Identität", "Identité"), cate: t("one of", "unul dintre", "eines davon", "l’un des moyens suivants"), elemente: [
          { t: t("a valid official ID with a photo: passport, ID card or a paper that stands in for them, in the original", "un act de identitate oficial valabil, cu fotografie: pașaport, carte de identitate sau un act care le ține locul, în original", "ein gültiger amtlicher Ausweis mit Lichtbild: Pass, Personalausweis oder Pass- oder Ausweisersatz, im Original", `une pièce d’identité officielle valide avec photo${N}: passeport, carte d’identité ou document qui en tient lieu, en original`), o: "eines gültigen amtlichen Ausweises, der ein Lichtbild des Inhabers enthält" },
          { t: t("the online ID of a German ID card, an eID card or an electronic residence permit", "identificarea online cu cartea de identitate germană, cu un card eID sau cu permisul de ședere electronic", "elektronischer Identitätsnachweis mit Personalausweis, eID-Karte oder elektronischem Aufenthaltstitel", "l’identification en ligne avec la carte d’identité allemande, une carte eID ou le titre de séjour électronique") },
          { t: t("a qualified electronic signature, with a first transfer from an account in your name", "o semnătură electronică calificată, cu un prim transfer dintr-un cont pe numele dumneavoastră", "eine qualifizierte elektronische Signatur, mit einer ersten Überweisung von einem Konto auf den eigenen Namen", "une signature électronique qualifiée, avec un premier virement depuis un compte à votre nom") },
          { t: t("a notified European electronic ID scheme", "un sistem european de identificare electronică notificat", "ein notifiziertes europäisches elektronisches Identifizierungssystem", "un schéma européen d’identification électronique notifié") },
          { t: t("under 16 without an ID of your own: the birth certificate, with your legal representative's ID checked", "sub 16 ani, fără act propriu: certificatul de naștere, cu verificarea actului reprezentantului legal", "unter 16 Jahren ohne eigenen Ausweis: die Geburtsurkunde, mit Prüfung der Identität des gesetzlichen Vertreters", `moins de 16${N}ans sans pièce propre${N}: l’acte de naissance, avec la vérification de l’identité du représentant légal`), o: "die Geburtsurkunde in Verbindung mit der Überprüfung der Identität des gesetzlichen Vertreters" },
          { t: t("for a basic account only: the certificate of suspended deportation (Duldung), or an asylum seeker's proof of arrival", "doar pentru un cont de bază: adeverința de suspendare a expulzării (Duldung) sau dovada de sosire a solicitantului de azil", "nur für ein Basiskonto: die Bescheinigung über die Aussetzung der Abschiebung (Duldung) oder der Ankunftsnachweis", `pour un compte de base seulement${N}: l’attestation de suspension de l’expulsion (Duldung) ou l’attestation d’arrivée du demandeur d’asile`) },
        ] },
        { titlu: t("The copy", "Copia", "Die Kopie", "La copie"), elemente: [
          { t: t("the bank has the right and the duty to copy the papers it checked; it keeps the copy for five years and destroys it after ten at the latest", "banca are dreptul și obligația să copieze actele verificate; păstrează copia cinci ani și o distruge cel târziu după zece", "die Bank hat das Recht und die Pflicht, die geprüften Dokumente zu kopieren; sie bewahrt die Kopie fünf Jahre auf und vernichtet sie spätestens nach zehn", `la banque a le droit et l’obligation de copier les pièces vérifiées${N}; elle garde la copie cinq ans et la détruit au plus tard après dix ans`), o: "das Recht und die Pflicht, Kopien dieser Dokumente oder Unterlagen anzufertigen" },
        ] },
      ],
    },
    {
      sectiune: t("Also asked", "Se mai cere", "Außerdem erfragt", "Également demandé"),
      grupuri: [{ titlu: t("May be asked", "Se poate cere", "Darf erfragt werden", "Peut être demandé"), elemente: [
        { t: t("the purpose and type of account you want; for a current account, the type of account shows the purpose", "scopul și tipul contului; la un cont curent, scopul reiese din tipul contului", "Zweck und angestrebte Art der Geschäftsbeziehung; beim Girokonto ergibt er sich aus der Kontoart", `l’objet et la nature du compte${N}; pour un compte courant, l’objet découle de la nature du compte`) },
        { t: t("whether you, a family member or a close associate hold a prominent public office", "dacă dumneavoastră, cineva din familie sau un apropiat aveți o funcție publică importantă", "ob Sie, ein Familienmitglied oder eine bekanntermaßen nahestehende Person politisch exponiert sind", "si vous, un membre de votre famille ou un proche êtes une personne politiquement exposée"), o: "politisch exponierte Person" },
        { t: t("whether you act for someone else (the beneficial owner)", "dacă acționați pentru altcineva (beneficiarul real)", "ob Sie für einen wirtschaftlich Berechtigten handeln", "si vous agissez pour quelqu’un d’autre (bénéficiaire effectif)") },
        { t: t("your German tax ID; if you do not give it, the bank asks the Federal Central Tax Office for it", "codul german de identificare fiscală; dacă nu-l dați, banca îl cere Oficiului Federal Central de Impozite", "die steuerliche Identifikationsnummer; wird sie nicht mitgeteilt, fragt die Bank beim Bundeszentralamt für Steuern an", `votre numéro d’identification fiscale allemand${N}; si vous ne le donnez pas, la banque le demande à l’Office central fédéral des impôts`) },
        { t: t("a self-certification of where you are resident for tax", "o declarație proprie despre țara în care sunteți rezident fiscal", "eine Selbstauskunft zur steuerlichen Ansässigkeit", "une auto-certification de votre résidence fiscale"), o: "eine Selbstauskunft" },
        { t: t("for a basic account: the official application form", "pentru un cont de bază: formularul oficial de cerere", "beim Basiskonto: der amtliche Antragsvordruck", `pour un compte de base${N}: le formulaire officiel de demande`) },
        { t: t("only where the risk is higher: where the money comes from", "doar unde riscul e mai mare: de unde provin banii", "nur bei erhöhtem Risiko: die Herkunft der Vermögenswerte", `seulement si le risque est plus élevé${N}: l’origine des fonds`) },
      ] }],
    },
  ],
  interzise: {
    titlu: t("What the bank may not do", "Ce nu poate face banca", "Was die Bank nicht darf", "Ce que la banque ne peut pas faire"),
    elemente: [
      { t: t("use these data for anything but preventing money laundering and terrorist financing", "să folosească aceste date pentru altceva decât prevenirea spălării banilor și a finanțării terorismului", "die Daten für anderes verarbeiten als die Verhinderung von Geldwäsche und Terrorismusfinanzierung", "utiliser ces données à d’autres fins que la prévention du blanchiment et du financement du terrorisme"), o: "nur verarbeiten, soweit dies … für Zwecke der Verhinderung von Geldwäsche und Terrorismusfinanzierung erforderlich ist" },
      { t: t("for a basic account: call the official form incomplete once you have filled it in completely", "la un cont de bază: să spună că formularul oficial e incomplet după ce l-ați completat în întregime", "beim Basiskonto: einen vollständig ausgefüllten Antragsvordruck als unvollständig behandeln", `pour un compte de base${N}: traiter comme incomplet un formulaire officiel entièrement rempli`), o: "kann sich der Verpflichtete nicht darauf berufen, dass der Antrag unvollständig sei" },
      { t: t("for a basic account: refuse it for reasons other than those the law lists, such as an account you can already use in Germany or a termination by the bank in the last year", "la un cont de bază: să-l refuze din alte motive decât cele din lege, cum ar fi un cont pe care îl puteți folosi deja în Germania sau o reziliere de către bancă în ultimul an", "beim Basiskonto: aus anderen als den gesetzlich genannten Gründen ablehnen, etwa ein bereits nutzbares Konto in Deutschland oder eine Kündigung durch die Bank im letzten Jahr", `pour un compte de base${N}: le refuser pour d’autres motifs que ceux de la loi, comme un compte que vous pouvez déjà utiliser en Allemagne ou une résiliation par la banque dans l’année`), o: "nur aus den in den §§ 35 bis 37 genannten Gründen" },
      { t: t("for a basic account: make you buy other services", "la un cont de bază: să vă oblige să cumpărați alte servicii", "beim Basiskonto: den Erwerb zusätzlicher Dienstleistungen verlangen", `pour un compte de base${N}: vous obliger à acheter d’autres services`), o: "Sie sind nicht verpflichtet, zusätzliche Dienstleistungen zu erwerben" },
    ],
  },
  cerute: [
    t("Passport or ID card (the bank checks the original and copies it)", "Pașaport sau carte de identitate (banca verifică originalul și îl copiază)", "Reisepass oder Personalausweis (die Bank prüft das Original und kopiert es)", "Passeport ou carte d’identité (la banque vérifie l’original et le copie)"),
    t("Place of birth, nationality and home address", "Locul nașterii, cetățenia și adresa de domiciliu", "Geburtsort, Staatsangehörigkeit und Wohnanschrift", "Lieu de naissance, nationalité et adresse du domicile"),
    t("German tax ID (Steuer-ID)", "Codul german de identificare fiscală (Steuer-ID)", "Steuerliche Identifikationsnummer", "Numéro d’identification fiscale allemand (Steuer-ID)"),
    t("Self-certification of tax residence", "Declarația despre rezidența fiscală", "Selbstauskunft zur steuerlichen Ansässigkeit", "Auto-certification de résidence fiscale"),
  ],
  surse: [
    { titlu: "Geldwäschegesetz, §§ 10, 11, 11a, 15", despre: t("what is collected, and for what", "ce se notează și în ce scop", "was erhoben wird, und wozu", "ce qui est relevé, et dans quel but"), url: "https://www.gesetze-im-internet.de/gwg_2017/__11.html", versiune: [["modificat", "2026-06-29"], "BGBl. 2026 I Nr. 197"] },
    { titlu: "Geldwäschegesetz, § 12", despre: t("the papers that prove identity", "actele care dovedesc identitatea", "womit die Identität überprüft wird", "les pièces qui prouvent l’identité"), url: "https://www.gesetze-im-internet.de/gwg_2017/__12.html", versiune: [["modificat", "2026-06-29"], "BGBl. 2026 I Nr. 197"] },
    { titlu: "Geldwäschegesetz, § 8", despre: t("copies, five and ten years", "copiile, cinci și zece ani", "Kopien, fünf und zehn Jahre", "les copies, cinq et dix ans"), url: "https://www.gesetze-im-internet.de/gwg_2017/__8.html", versiune: [["modificat", "2026-06-29"], "BGBl. 2026 I Nr. 197"] },
    { titlu: "Zahlungskonto-Identitätsprüfungsverordnung, § 1", url: "https://www.gesetze-im-internet.de/zidpr_fv/__1.html", versiune: [["modificat", "2017-07-17"]] },
    { titlu: "Abgabenordnung, § 154", despre: t("tax ID", "codul fiscal", "Steuer-ID", "numéro fiscal"), url: "https://www.gesetze-im-internet.de/ao_1977/__154.html", versiune: [["modificat", "2026-07-03"], "BGBl. 2026 I Nr. 199"] },
    { titlu: "Finanzkonten-Informationsaustauschgesetz, § 13", despre: t("tax residence", "rezidența fiscală", "steuerliche Ansässigkeit", "résidence fiscale"), url: "https://www.gesetze-im-internet.de/fkaustg/__13.html", versiune: [["modificat", "2025-12-22"]] },
    { titlu: "Zahlungskontengesetz, §§ 31–38", despre: t("basic account", "contul de bază", "Basiskonto", "compte de base"), url: "https://www.gesetze-im-internet.de/zkg/__34.html", versiune: [["modificat", "2026-04-09"], "BGBl. 2026 I Nr. 97"] },
    { titlu: "Zahlungskontengesetz, Anlage 3", despre: t("basic account form", "formularul pentru contul de bază", "Antragsvordruck für das Basiskonto", "formulaire du compte de base"), url: "https://www.gesetze-im-internet.de/zkg/anlage_3.html", versiune: [["modificat", "2026-04-09"], "BGBl. 2026 I Nr. 97"] },
    { titlu: "BaFin, Auslegungs- und Anwendungshinweise zum Geldwäschegesetz", url: "https://www.bafin.de/SharedDocs/Downloads/DE/Auslegungsentscheidung/dl-ae-auas-2025-gw.html", versiune: [["stand", "2025-07"]] },
  ],
  verificat: "2026-10-20",
};

const DE_ANGAJARE: Trusa = {
  id: "de-angajare",
  scurt: t("Job in Germany", "Angajare în Germania", "Arbeit in Deutschland", "Emploi en Allemagne"),
  titlu: t("Starting a job in Germany: what an employer may ask and when", "Angajare în Germania: ce poate cere angajatorul și când",
    "Bewerbung: was Arbeitgeber fragen dürfen, und wann", `Emploi en Allemagne${N}: ce que l’employeur peut demander`),
  pagina: t("papers-employer-may-ask-germany", "acte-cerute-angajare-germania", "fragerecht-arbeitgeber-bewerbung", "pieces-employeur-allemagne"),
  regula: t(
    "No law lists what may be asked while you apply. The data protection authorities and the Federal Anti-Discrimination Agency, summing up the courts, say an employer may ask only what matters for the job, and as a rule nothing that touches ethnic origin, gender, religion, disability, age or sexual identity. Questions that are not allowed need not be answered, and you may answer them untruthfully. Once you are hired, the law names the tax and social insurance data the employer needs.",
    "Nicio lege nu spune ce se poate cere cât timp candidați. Autoritățile de protecție a datelor și Agenția federală împotriva discriminării, rezumând jurisprudența, spun că se poate cere doar ce contează pentru postul concret și, de regulă, nimic legat de originea etnică, sex, religie, dizabilitate, vârstă sau identitate sexuală. La întrebările nepermise aveți dreptul să nu răspundeți sau să nu spuneți adevărul. După angajare, legea numește datele fiscale și de asigurări sociale de care are nevoie angajatorul.",
    "Kein Gesetz zählt auf, was im Bewerbungsverfahren gefragt werden darf. Die Datenschutzbehörden und die Antidiskriminierungsstelle des Bundes fassen die Rechtsprechung so zusammen: Gefragt werden darf nur, was für die konkrete Stelle von Bedeutung ist, und in der Regel nichts, was ethnische Herkunft, Geschlecht, Religion, Behinderung, Alter oder sexuelle Identität berührt. Auf unzulässige Fragen müssen Sie nicht oder nicht wahrheitsgemäß antworten. Bei der Einstellung nennt das Gesetz die Steuer- und Sozialversicherungsdaten, die der Arbeitgeber braucht.",
    `Aucune loi ne dit ce qui peut être demandé pendant la candidature. Les autorités allemandes de protection des données et l’Agence fédérale de lutte contre les discriminations, résumant la jurisprudence, disent que l’on ne peut demander que ce qui compte pour le poste concret et, en règle générale, rien qui touche l’origine ethnique, le sexe, la religion, le handicap, l’âge ou l’identité sexuelle. À une question non permise, vous avez le droit de ne pas répondre, ou de ne pas répondre sincèrement. À l’embauche, la loi nomme les données fiscales et sociales dont l’employeur a besoin.`),
  descriere: t(
    "What an employer in Germany may ask while you apply and once you are hired, as the authorities sum up the courts, and what may not be asked.",
    "Ce poate cere un angajator din Germania cât timp candidați și după angajare, după cum rezumă autoritățile jurisprudența, și ce nu se poate cere.",
    "Was Arbeitgeber im Bewerbungsverfahren und bei der Einstellung fragen dürfen, nach Datenschutzbehörden und Antidiskriminierungsstelle, und was nicht.",
    `Ce qu’un employeur en Allemagne peut demander pendant la candidature et à l’embauche, selon les autorités, et ce qu’il ne peut pas demander.`),
  permise: [
    {
      sectiune: t("While you apply", "Cât timp candidați", "Im Bewerbungsverfahren", "Pendant la candidature"),
      grupuri: [{ titlu: t("May be asked, if the job needs it", "Se poate cere, dacă postul o cere", "Darf gefragt werden, wenn die Stelle es erfordert", "Peut être demandé, si le poste le requiert"), elemente: [
        { t: t("your name and one way to reach you", "numele și un mod de a vă contacta", "Name und eine Kontaktmöglichkeit", "votre nom et un moyen de vous joindre"), o: "Es reicht aus, wenn der Bewerber … eine Kontaktmöglichkeit angibt." },
        { t: t("your ID card, shown at the interview; that does not by itself allow a copy", "buletinul, arătat la interviu; asta nu înseamnă că e permisă și o copie", "den Personalausweis, im Gespräch vorgelegt; eine Kopie ist damit nicht ohne Weiteres zulässig", `votre carte d’identité, montrée à l’entretien${N}; cela ne permet pas pour autant d’en faire une copie`), o: "damit ist aber nicht gesagt, dass eine Kopie hiervon zulässig ist." },
        { t: t("a driving licence, if the work needs one", "permisul de conducere, dacă munca o cere", "Führerschein, wenn er für die Arbeit benötigt wird", "le permis de conduire, si le travail le demande") },
        { t: t("languages, if they matter for the work", "limbile vorbite, dacă au importanță pentru muncă", "Sprachkenntnisse, wenn sie für die Tätigkeit bedeutsam sind", "les langues, si elles comptent pour le travail") },
        { t: t("whether you have a work permit", "dacă aveți drept de muncă", "ob Sie eine Arbeitserlaubnis besitzen", "si vous avez une autorisation de travail"), o: "Besitzen Sie eine Arbeitserlaubnis?" },
        { t: t("convictions, only in the area of criminal law that matters for the job", "condamnări, doar din domeniul penal care contează pentru post", "Vorstrafen, beschränkt auf das für den Arbeitsplatz wichtige Strafrechtsgebiet", "les condamnations, seulement dans le domaine pénal qui compte pour le poste"), o: "nur unter Beschränkung auf das für den jeweiligen Arbeitsplatz wichtige Strafrechtsgebiet" },
        { t: t("health, only where a condition lastingly or regularly limits your fitness for the work, or puts others at risk", "sănătatea, doar dacă o afecțiune vă limitează în mod durabil sau repetat aptitudinea pentru muncă ori pune în pericol pe alții", "Gesundheit nur, soweit eine Erkrankung die Eignung für die Tätigkeit dauerhaft oder regelmäßig einschränkt oder Dritte gefährdet", "la santé, seulement si une affection limite durablement ou régulièrement votre aptitude au travail, ou met autrui en danger") },
        { t: t("debts and wage garnishments, only for positions of trust with large financial latitude", "datorii și popriri pe salariu, doar pentru posturi de încredere cu mare libertate financiară", "Lohnpfändungen und Schulden nur bei Vertrauenspositionen mit beträchtlichen finanziellen Spielräumen", "les dettes et saisies sur salaire, seulement pour des postes de confiance avec une grande latitude financière") },
      ] }],
    },
    {
      sectiune: t("Once you are hired", "La angajare", "Bei der Einstellung", "À l’embauche"),
      grupuri: [{ titlu: t("The law names", "Legea numește", "Das Gesetz nennt", "La loi nomme"), elemente: [
        { t: t("your tax ID and date of birth, and whether this is your first or a further job", "codul de identificare fiscală și data nașterii, și dacă e primul dumneavoastră loc de muncă sau unul secundar", "Identifikationsnummer und Geburtsdatum, und ob es das erste oder ein weiteres Dienstverhältnis ist", "votre numéro d’identification fiscale et votre date de naissance, et s’il s’agit de votre premier emploi ou d’un emploi supplémentaire") },
        { t: t("your social insurance number if you have one, with your names, date of birth, nationality and address for the registration", "numărul de asigurări sociale, dacă aveți unul, cu numele, data nașterii, cetățenia și adresa, pentru înregistrare", "die Versicherungsnummer, soweit bekannt, mit Namen, Geburtsdatum, Staatsangehörigkeit und Anschrift für die Meldung", "votre numéro d’assurance sociale si vous en avez un, avec vos noms, date de naissance, nationalité et adresse pour la déclaration"), o: "Versicherungsnummer, soweit bekannt" },
        { t: t("the health insurance fund you chose", "casa de asigurări de sănătate pe care ați ales-o", "die gewählte Krankenkasse", "la caisse d’assurance maladie que vous avez choisie") },
        { t: t("if you need a residence title to work: the title or the work permit, which the employer checks and keeps a copy of while you work there", "dacă aveți nevoie de un permis de ședere ca să lucrați: permisul sau autorizația de muncă, pe care angajatorul le verifică și le păstrează în copie cât lucrați acolo", "wer einen Aufenthaltstitel braucht: der Titel oder die Arbeitserlaubnis, die der Arbeitgeber prüft und für die Dauer der Beschäftigung in Kopie aufbewahrt", `si vous avez besoin d’un titre de séjour pour travailler${N}: le titre ou l’autorisation de travail, que l’employeur vérifie et garde en copie pendant l’emploi`), o: "für die Dauer der Beschäftigung eine Kopie des Aufenthaltstitels … aufbewahren" },
        { t: t("an extended certificate of good conduct, only for work with minors or where a law provides it, on the employer's written request", "un certificat de bună conduită extins, doar pentru munca cu minori sau unde o lege îl prevede, la cererea scrisă a angajatorului", "ein erweitertes Führungszeugnis nur bei Arbeit mit Minderjährigen oder wo ein Gesetz es vorsieht, auf schriftliche Aufforderung des Arbeitgebers", "un extrait de casier judiciaire élargi, seulement pour un travail avec des mineurs ou si une loi le prévoit, sur demande écrite de l’employeur") },
      ] }],
    },
  ],
  interzise: {
    titlu: t("May not be asked while you apply", "Nu se poate cere cât timp candidați", "Darf im Bewerbungsverfahren nicht gefragt werden", "Ne peut pas être demandé pendant la candidature"),
    elemente: [
      { t: t("pregnancy, even for a maternity cover", "sarcina, nici pentru un post de înlocuire pe durata unui concediu de maternitate", "Schwangerschaft, auch nicht bei einer Schwangerschaftsvertretung", "la grossesse, même pour un remplacement de congé maternité"), o: "Die Frage nach einer vorliegenden Schwangerschaft ist grundsätzlich unzulässig." },
      { t: t("marital status, children, wanting children, who you live with", "starea civilă, copiii, dorința de a avea copii, cu cine locuiți", "Familienstand, Kinder, Kinderwunsch, mit wem Sie zusammenleben", "la situation familiale, les enfants, le désir d’enfant, avec qui vous vivez") },
      { t: t("ethnic origin, mother tongue, where you were born", "originea etnică, limba maternă, unde v-ați născut", "ethnische Herkunft, Muttersprache, Geburtsort", "l’origine ethnique, la langue maternelle, le lieu de naissance"), o: "Fragen nach der ethnischen Herkunft sind … immer unzulässig" },
      { t: t("whether you are a man or a woman, or transgender", "dacă sunteți bărbat sau femeie ori transgender", "ob Sie ein Mann oder eine Frau oder transgeschlechtlich sind", "si vous êtes un homme ou une femme, ou transgenre") },
      { t: t("religion, except where a religious employer may require it for the job", "religia, în afară de cazul în care un angajator religios o poate cere pentru post", "Religion, außer wo eine Religionsgemeinschaft sie als berufliche Anforderung verlangen darf", "la religion, sauf si un employeur religieux peut l’exiger pour le poste") },
      { t: t("whether you are recognised as severely disabled, or your health in general", "dacă aveți un grad de handicap grav recunoscut, sau sănătatea în general", "ob eine Schwerbehinderung festgestellt ist, oder pauschal der Gesundheitszustand", "si un handicap lourd vous est reconnu, ou votre santé en général"), o: "Pauschal nach dem Gesundheitszustand zu fragen, ist nicht zulässig" },
      { t: t("your own full extract from the federal criminal register (Selbstauskunft)", "extrasul complet din registrul federal de cazier, cerut chiar de dumneavoastră (Selbstauskunft)", "eine Selbstauskunft aus dem Bundeszentralregister", "un relevé personnel du registre fédéral des condamnations"), o: "Grob rechtswidrig ist es, den Bewerber eine Selbstauskunft aus dem BZRG vorlegen zu lassen." },
      { t: t("checks of your private social networks", "verificări pe rețelele dumneavoastră sociale private", "Background-Checks in privaten sozialen Netzwerken", "des vérifications sur vos réseaux sociaux privés"), o: "Private Netzwerke dürfen nicht für Background-Checks herangezogen werden." },
      { t: t("anything beyond these limits, even with your consent", "orice depășește aceste limite, nici cu acordul dumneavoastră", "alles, was über diese Grenzen hinausgeht, auch nicht mit Einwilligung", "ce qui dépasse ces limites, même avec votre consentement"), o: "können auch mithilfe einer Einwilligung nicht erweitert werden" },
    ],
  },
  cerute: [
    t("Tax ID (Steuer-ID) and date of birth", "Codul de identificare fiscală (Steuer-ID) și data nașterii", "Steuerliche Identifikationsnummer und Geburtsdatum", "Numéro d’identification fiscale (Steuer-ID) et date de naissance"),
    t("Social insurance number (if you have one)", "Numărul de asigurări sociale (dacă aveți)", "Sozialversicherungsnummer (falls vorhanden)", "Numéro d’assurance sociale (si vous en avez un)"),
    t("The health insurance fund you chose", "Casa de asigurări de sănătate aleasă", "Gewählte Krankenkasse", "Caisse d’assurance maladie choisie"),
    t("Residence title or work permit (if you need one to work)", "Permisul de ședere sau de muncă (dacă aveți nevoie de el ca să lucrați)", "Aufenthaltstitel oder Arbeitserlaubnis (falls nötig)", "Titre de séjour ou autorisation de travail (si nécessaire)"),
  ],
  surse: [
    { titlu: "Landesbeauftragte für den Datenschutz Baden-Württemberg, Ratgeber Beschäftigtendatenschutz", url: "https://www.baden-wuerttemberg.datenschutz.de/wp-content/uploads/2020/04/Ratgeber-Besch%C3%A4ftigtendatenschutz.pdf", versiune: [["stand", "2020-04"], t("4th edition", "ediția a 4-a", "4. Auflage", "4e édition")] },
    { titlu: "Bundesbeauftragte für den Datenschutz, FAQ Beschäftigtendatenschutz", url: "https://www.bfdi.bund.de/DE/Buerger/Inhalte/Arbeit-Besch%C3%A4ftigung/Besch%C3%A4ftigtendatenschutz/FAQ_Besch%C3%A4ftigtendatenschutz.html", versiune: [["fara"]] },
    { titlu: "Hamburgische Beauftragte für Datenschutz, Bewerberdatenschutz und Recruiting im Fokus", url: "https://datenschutz-hamburg.de/fileadmin/user_upload/HmbBfDI/Datenschutz/Informationen/240606_Information_Bewerberdatenschutz_und_Recruiting.pdf", versiune: [["data", "2024-06-06"]] },
    { titlu: "Antidiskriminierungsstelle des Bundes, Fair in den Job! Leitfaden für diskriminierungsfreie Einstellungsverfahren", url: "https://www.antidiskriminierungsstelle.gov.de/SharedDocs/downloads/DE/publikationen/Leitfaeden/leitfaden_fair_in_den_job.pdf?__blob=publicationFile&v=3", versiune: [["stand", "2019-10"], t("1st edition", "ediția 1", "1. Auflage", "1re édition")] },
    { titlu: "Allgemeines Gleichbehandlungsgesetz, §§ 1, 7, 9", url: "https://www.gesetze-im-internet.de/agg/__1.html", versiune: [["modificat", "2023-12-22"]] },
    { titlu: "Einkommensteuergesetz, § 39e", despre: t("tax ID at hiring", "codul fiscal la angajare", "Steuer-ID bei der Einstellung", "numéro fiscal à l’embauche"), url: "https://www.gesetze-im-internet.de/estg/__39e.html", versiune: [["modificat", "2026-06-29"], "BGBl. 2026 I Nr. 197"] },
    { titlu: "Sozialgesetzbuch IV, § 28a", despre: t("registration", "înregistrarea la asigurările sociale", "Meldung zur Sozialversicherung", "déclaration à la sécurité sociale"), url: "https://www.gesetze-im-internet.de/sgb_4/__28a.html", versiune: [["modificat", "2026-07-24"], "BGBl. 2026 I Nr. 228"] },
    { titlu: "Sozialgesetzbuch V, § 175", despre: t("health insurance fund", "casa de asigurări de sănătate", "Wahl der Krankenkasse", "caisse d’assurance maladie"), url: "https://www.gesetze-im-internet.de/sgb_5/__175.html", versiune: [["modificat", "2026-06-26"], "BGBl. 2026 I Nr. 195"] },
    { titlu: "Aufenthaltsgesetz, § 4a", despre: t("residence title and copy", "permisul de ședere și copia lui", "Aufenthaltstitel und Kopie", "titre de séjour et copie"), url: "https://www.gesetze-im-internet.de/aufenthg_2004/__4a.html", versiune: [["modificat", "2026-07-21"], "BGBl. 2026 I Nr. 221"] },
    { titlu: "Bundeszentralregistergesetz, § 30a", despre: t("extended certificate of good conduct", "certificatul de bună conduită extins", "erweitertes Führungszeugnis", "extrait de casier élargi"), url: "https://www.gesetze-im-internet.de/bzrg/__30a.html", versiune: [["modificat", "2026-06-18"], "BGBl. 2026 I Nr. 183"] },
  ],
  verificat: "2026-10-20",
};

const FR_ANGAJARE: Trusa = {
  id: "fr-angajare",
  scurt: t("Job in France", "Angajare în Franța", "Arbeit in Frankreich", "Emploi en France"),
  titlu: t("Starting a job in France: what an employer may ask, and when", "Angajare în Franța: ce poate cere angajatorul și când",
    "Arbeit in Frankreich: was Arbeitgeber fragen dürfen und wann", `Recrutement${N}: ce que l’employeur peut demander, et quand`),
  pagina: t("papers-employer-may-ask-france", "acte-cerute-angajare-franta", "unterlagen-arbeitgeber-frankreich", "pieces-employeur-recrutement"),
  regula: t(
    "There is no closed list. What an employer asks you as a candidate must have a direct and necessary link with the job or with assessing your professional skills, and you may refuse to give what has no such link. The CNIL, France's data protection authority, separates what may be asked during selection from what is needed only once you are hired, such as your social security number and bank details.",
    "Nu există o listă închisă. Ce vă cere angajatorul cât timp candidați trebuie să aibă o legătură directă și necesară cu postul sau cu evaluarea aptitudinilor dumneavoastră profesionale, iar dumneavoastră puteți refuza să dați ce nu are legătură cu postul. CNIL, autoritatea franceză de protecție a datelor, desparte ce se poate cere în timpul selecției de ce e nevoie doar după angajare, cum ar fi numărul de securitate socială și datele bancare.",
    "Es gibt keine abschließende Liste. Was ein Arbeitgeber von Ihnen als Bewerber erfragt, muss einen direkten und notwendigen Bezug zur Stelle oder zur Bewertung Ihrer beruflichen Fähigkeiten haben, und Sie dürfen verweigern, was keinen Bezug zur Stelle hat. Die CNIL, die französische Datenschutzbehörde, trennt, was in der Auswahl gefragt werden darf, von dem, was erst nach der Einstellung nötig ist, etwa die Sozialversicherungsnummer und die Bankverbindung.",
    `Il n’y a pas de liste limitative. Les informations demandées à un candidat doivent présenter un lien direct et nécessaire avec l’emploi proposé ou avec l’évaluation des aptitudes professionnelles, et vous pouvez refuser de fournir une information sans lien avec l’emploi. La CNIL distingue ce qui peut être demandé pendant la sélection de ce qui n’est nécessaire qu’après l’embauche, comme le numéro de sécurité sociale et les coordonnées bancaires.`),
  descriere: t(
    "What an employer in France may ask during selection and once you are hired, under the Code du travail and the CNIL, and what may not be asked.",
    "Ce poate cere un angajator din Franța în timpul selecției și după angajare, după Codul muncii și CNIL, și ce nu se poate cere.",
    "Was Arbeitgeber in Frankreich in der Auswahl und nach der Einstellung fragen dürfen, nach dem Code du travail und der CNIL, und was nicht.",
    `Ce que l’employeur peut demander pendant la sélection et après l’embauche, selon le Code du travail et la CNIL, et ce qu’il ne peut pas demander.`),
  permise: [
    {
      sectiune: t("During selection", "În timpul selecției", "Während der Auswahl", "Pendant la sélection"),
      grupuri: [
        { titlu: t("May be asked (the CNIL's examples)", "Se poate cere (exemplele CNIL)", "Darf verlangt werden (Beispiele der CNIL)", "Peut être demandé (exemples de la CNIL)"), elemente: [
          { t: t("CV and cover letter", "CV-ul și scrisoarea de intenție", "Lebenslauf und Anschreiben", "le curriculum vitae et la lettre de motivation") },
          { t: t("professional references, if you were told beforehand", "recomandări profesionale, dacă ați fost anunțat dinainte", "berufliche Referenzen, wenn man vorher informiert wurde", "des recommandations professionnelles, si vous en avez été informé au préalable"), o: "dès lors que le candidat en a été préalablement informé" },
          { t: t("the diplomas and titles the job requires", "diplomele și titlurile cerute pentru post", "die für die Stelle erforderlichen Diplome und Titel", "les diplômes et titres requis pour le poste") },
          { t: t("work certificates from previous jobs", "certificatele de muncă de la locurile de muncă anterioare", "Arbeitsbescheinigungen früherer Arbeitgeber (certificats de travail)", "les certificats de travail des emplois précédents") },
          { t: t("a driving licence, if the job needs one", "permisul de conducere, dacă postul o cere", "Führerschein, wenn die Stelle es erfordert", "le permis de conduire, si le poste le nécessite"), o: "dès lors que le poste le nécessite" },
          { t: t("whether you have the right to work in France, with only the papers needed to check it", "dacă aveți dreptul să lucrați în Franța, doar cu actele necesare verificării", "ob Sie in Frankreich arbeiten dürfen, nur mit den dafür nötigen Nachweisen", "si vous avez le droit de travailler en France, avec les seules pièces nécessaires à la vérification"), o: "les seules pièces justificatives et informations qui lui sont nécessaires" },
          { t: t("nationality, where it is needed, only as French, EU national or non-EU", "cetățenia, unde e nevoie, doar ca francez, cetățean UE sau din afara UE", "Staatsangehörigkeit, wo nötig, nur als französisch, EU oder außerhalb der EU", `la nationalité, si elle est nécessaire, seulement sous la forme «${N}Français${N}», «${N}ressortissant de l’Union européenne${N}» ou «${N}hors UE${N}»`) },
        ] },
        { titlu: t("Criminal record", "Cazier judiciar", "Strafregister", "Casier judiciaire"), elemente: [
          { t: t("criminal record extract no. 3 (bulletin n° 3), only where the job justifies it: shown on paper, never copied, kept or sent by e-mail", "extrasul nr. 3 din cazierul judiciar (bulletin n° 3), doar dacă postul îl justifică: arătat pe hârtie, niciodată copiat, păstrat sau trimis pe e-mail", "Auszug Nr. 3 (bulletin n° 3), nur wenn die Stelle es rechtfertigt: auf Papier vorgezeigt, nie kopiert, aufbewahrt oder per E-Mail geschickt", `le bulletin n°${N}3, seulement si le poste le justifie${N}: consulté sur papier, jamais copié, conservé ni envoyé par e-mail`), o: "consulter un extrait papier du bulletin B3 du candidat, sans le conserver, ni en faire de copie" },
          { t: t("criminal record extract no. 2 (bulletin n° 2), only where a text provides it (for example work with minors), through an administrative authority", "extrasul nr. 2 din cazierul judiciar (bulletin n° 2), doar unde un text îl prevede (de exemplu munca cu minori), prin intermediul unei autorități", "Auszug Nr. 2 (bulletin n° 2), nur wo ein Text es vorsieht (etwa Arbeit mit Minderjährigen), über eine Behörde", `le bulletin n°${N}2, seulement si un texte le prévoit (par exemple un travail auprès de mineurs), par une autorité administrative`) },
        ] },
      ],
    },
    {
      sectiune: t("Once you are hired", "După angajare", "Nach der Einstellung", "Après l’embauche"),
      grupuri: [{ titlu: t("What the employer needs", "De ce are nevoie angajatorul", "Was der Arbeitgeber braucht", "Ce dont l’employeur a besoin"), elemente: [
        { t: t("for the declaration before hiring: name, first names, sex, date and place of birth, and your social security number if you are already registered", "pentru declarația dinaintea angajării: numele, prenumele, sexul, data și locul nașterii și numărul de securitate socială, dacă sunteți deja înregistrat", "für die Meldung vor der Einstellung (DPAE): Name, Vornamen, Geschlecht, Geburtsdatum und -ort, und die Sozialversicherungsnummer, falls schon vergeben", `pour la déclaration préalable à l’embauche${N}: nom, prénoms, sexe, date et lieu de naissance, et numéro de sécurité sociale si vous êtes déjà immatriculé`), o: "Nom, prénoms, sexe, date et lieu de naissance du salarié ainsi que son numéro national d’identification s’il est déjà immatriculé" },
        { t: t("for the staff register: nationality, job and qualification", "pentru registrul personalului: cetățenia, postul și calificarea", "für das Personalregister: Staatsangehörigkeit, Stelle und Qualifikation", `pour le registre unique du personnel${N}: nationalité, emploi et qualification`) },
        { t: t("bank details, proof of address and someone to contact in an emergency", "datele bancare, o dovadă de domiciliu și o persoană de contactat în caz de urgență", "Bankverbindung, ein Wohnsitznachweis und eine Kontaktperson für Notfälle", "les coordonnées bancaires, un justificatif de domicile et les coordonnées d’une personne à prévenir en cas d’urgence") },
        { t: t("for a foreign worker: the type and number of the work authorisation, which the employer checks with the préfecture at least two working days before hiring and may keep a copy of", "pentru un lucrător străin: tipul și numărul autorizației de muncă, pe care angajatorul o verifică la prefectură cu cel puțin două zile lucrătoare înainte și îi poate păstra o copie", "für ausländische Arbeitnehmer: Art und Nummer der Arbeitserlaubnis, die der Arbeitgeber mindestens zwei Werktage vorher bei der Präfektur prüft und in Kopie aufbewahren darf", `pour un salarié étranger${N}: le type et le numéro du titre valant autorisation de travail, que l’employeur vérifie auprès de la préfecture au moins deux jours ouvrables avant l’embauche et dont il peut garder une copie`), o: "au moins deux jours ouvrables avant la date d’effet de l’embauche" },
        { t: t("a photo for the staff directory, if you want", "o fotografie pentru anuarul firmei, dacă doriți", "ein Foto für das Mitarbeiterverzeichnis, freiwillig", "une photographie pour l’annuaire, facultative"), o: "photographie facultative du salarié pour figurer dans un annuaire" },
        { t: t("from the occupational doctor, only whether you are fit for the job", "de la medicul de medicina muncii, doar dacă sunteți apt pentru post", "vom Arbeitsmediziner nur, ob Sie für die Stelle tauglich sind", "du médecin du travail, seulement l’aptitude au poste (apte ou inapte)") },
      ] }],
    },
  ],
  interzise: {
    titlu: t("May not be asked of you as a candidate", "Nu se poate cere unui candidat", "Darf von Bewerbern nicht verlangt werden", "Ne peut pas être demandé à un candidat"),
    elemente: [
      { t: t("the social security number and bank details, before you are hired", "numărul de securitate socială și datele bancare, înainte de angajare", "Sozialversicherungsnummer und Bankverbindung, vor der Einstellung", "le numéro de sécurité sociale et les coordonnées bancaires, avant l’embauche"), o: "son numéro de sécurité sociale et ses coordonnées bancaires" },
      { t: t("payslips", "fluturași de salariu", "Gehaltsabrechnungen", "les bulletins de paie") },
      { t: t("family members, whether you want children, pregnancy", "membrii familiei, dacă doriți copii, sarcina", "Familienangehörige, Kinderwunsch, Schwangerschaft", "les membres de la famille, le souhait d’avoir des enfants, la grossesse"), o: "interdit de rechercher ou de faire rechercher toutes informations concernant l’état de grossesse" },
      { t: t("health, height, weight or measurements, except for a few jobs", "sănătatea, înălțimea, greutatea sau măsurile, în afară de câteva meserii", "Gesundheit, Größe, Gewicht oder Körpermaße, außer bei wenigen Berufen", "la santé, la taille, le poids ou les mensurations, sauf pour quelques postes") },
      { t: t("origin, political, philosophical or religious opinions, union membership, sex life, even with your consent", "originea, opiniile politice, filozofice sau religioase, apartenența la un sindicat, viața sexuală, nici cu acordul dumneavoastră", "Herkunft, politische, weltanschauliche oder religiöse Überzeugungen, Gewerkschaftszugehörigkeit, Sexualleben, auch nicht mit Einwilligung", "l’origine, les opinions politiques, philosophiques ou religieuses, l’appartenance syndicale, la vie sexuelle, même avec votre accord"), o: "Même l’accord exprès du candidat ne saurait, à lui seul, justifier" },
      { t: t("your previous address, whether you own or rent, loans, associations", "adresa anterioară, dacă sunteți proprietar sau chiriaș, împrumuturile, asociațiile", "frühere Anschrift, ob Eigentümer oder Mieter, Kredite, Vereine", "l’adresse précédente, propriétaire ou locataire, les emprunts, la vie associative") },
      { t: t("when you came to France or were naturalised, how you became French, your nationality of origin or your parents'", "când ați venit în Franța sau ați fost naturalizat, cum ați devenit francez, cetățenia de origine sau a părinților", "wann Sie nach Frankreich kamen oder eingebürgert wurden, wie Sie Franzose wurden, frühere Staatsangehörigkeit oder die der Eltern", "la date d’entrée en France ou de naturalisation, le mode d’acquisition de la nationalité française, la nationalité d’origine ou celle des parents") },
      { t: t("military situation", "situația militară", "Wehrdienstverhältnisse", "la situation militaire") },
      { t: t("criminal record extract no. 1 (bulletin n° 1), under any circumstances; a copy of extract no. 3", "extrasul nr. 1 din cazierul judiciar (bulletin n° 1), în niciun caz; o copie a extrasului nr. 3", "Auszug Nr. 1 des Strafregisters, in keinem Fall; eine Kopie des Auszugs Nr. 3", `le bulletin n°${N}1 du casier judiciaire, en aucun cas${N}; une copie du bulletin n°${N}3`), o: "le bulletin B1 n’est accessible qu’aux autorités judiciaires et aux établissements pénitentiaires" },
    ],
  },
  cerute: [
    t("Social security number (if you have one)", "Numărul de securitate socială (dacă aveți)", "Sozialversicherungsnummer (falls vorhanden)", "Numéro de sécurité sociale (si vous en avez un)"),
    t("Bank details for your pay", "Datele bancare pentru salariu", "Bankverbindung für das Gehalt", "Coordonnées bancaires pour le salaire"),
    t("Proof of address", "Dovadă de domiciliu", "Wohnsitznachweis", "Justificatif de domicile"),
    t("Someone to contact in an emergency", "Persoană de contactat în caz de urgență", "Kontaktperson für Notfälle", "Personne à prévenir en cas d’urgence"),
    t("Work authorisation, its type and number (foreign workers)", "Autorizația de muncă, tipul și numărul ei (lucrători străini)", "Arbeitserlaubnis, Art und Nummer (ausländische Arbeitnehmer)", "Titre valant autorisation de travail, type et numéro (salariés étrangers)"),
  ],
  surse: [
    { titlu: "Code du travail, article L1221-6", url: "https://code.travail.gouv.fr/code-du-travail/l1221-6", versiune: [["actualizat", "2008-05-01"]] },
    { titlu: "Code du travail, article L1225-1 (grossesse)", url: "https://code.travail.gouv.fr/code-du-travail/l1225-1", versiune: [["actualizat", "2008-05-01"]] },
    { titlu: "Code du travail, article R1221-1 (déclaration préalable à l’embauche)", url: "https://code.travail.gouv.fr/code-du-travail/r1221-1", versiune: [["actualizat", "2017-09-01"]] },
    { titlu: "Code du travail, article D1221-23 (registre unique du personnel)", url: "https://code.travail.gouv.fr/code-du-travail/d1221-23", versiune: [["actualizat", "2008-05-01"]] },
    { titlu: "Code du travail, articles R5221-41 à R5221-43 (salarié étranger)", url: "https://code.travail.gouv.fr/code-du-travail/r5221-41", versiune: [["actualizat", "2021-04-01"]] },
    { titlu: "CNIL, Guide du recrutement (fiches 5, 16 et 18)", url: "https://www.cnil.fr/fr/le-guide-du-recrutement", versiune: [["publicat", "2023-01-30"]] },
    { titlu: "CNIL, Référentiel relatif aux traitements mis en œuvre aux fins de gestion du personnel", url: "https://www.cnil.fr/sites/cnil/files/2023-07/referentiel_grh_novembre_2019_0.pdf", versiune: [["adoptat", "2019-11-21"], ["modificat", "2022-05-23"]] },
    { titlu: "CNIL, « Recrutement : quelles informations peut-on me demander ? »", url: "https://www.cnil.fr/fr/cnil-direct/question/recrutement-quelles-informations-peut-me-demander", versiune: [["fara"]] },
    { titlu: "Service-public.gouv.fr, « Candidat à une offre d’emploi : méthodes de recrutement autorisées »", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1684", versiune: [["verificat", "2026-02-20"]] },
    { titlu: "Service-public.gouv.fr, « Casier judiciaire : bulletins n°1, n°2 et n°3 »", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F14710", versiune: [["verificat", "2026-08-20"]] },
    { titlu: "Ministère du Travail, « Offre d’emploi et embauche : les droits du candidat »", url: "https://code.travail.gouv.fr/fiche-ministere-travail/offre-demploi-et-embauche-les-droits-du-candidat", versiune: [["actualizat", "2024-12-06"]] },
  ],
  verificat: "2026-10-20",
};

// The French bank texts read in DILA's LEGI dump (2025-07-13) and every daily increment up to 2026-10-19.
const FR_CONT: Trusa = {
  id: "fr-cont",
  scurt: t("Bank account in France", "Cont bancar în Franța", "Bankkonto in Frankreich", "Compte bancaire en France"),
  titlu: t("A bank account in France: what the bank asks for, by law", "Cont bancar în Franța: ce cere banca, după lege",
    "Konto in Frankreich: was die Bank verlangt, nach dem Gesetz", `Compte bancaire${N}: ce que la banque demande, selon les textes`),
  pagina: t("papers-bank-account-france", "acte-cont-bancar-franta", "unterlagen-konto-frankreich", "pieces-ouverture-compte-bancaire"),
  regula: t(
    "The anti-money-laundering rules set it. Before opening an account, the bank records your name, first names, date and place of birth, and checks them on the original of a valid official paper with your photo, of which it takes a copy. You also tell it where you are resident for tax. What else it asks, to know you and the account (address, work, income), follows a list the texts call indicative and adapt to the risk, so each bank sets its own. If it refuses, it gives you its reasons for free. You can then ask the Banque de France to name a bank that must open an account for you, with a closed list of papers.",
    "Regulile împotriva spălării banilor o stabilesc. Înainte de a deschide un cont, banca vă notează numele, prenumele, data și locul nașterii și le verifică pe originalul unui act oficial valabil cu fotografia dumneavoastră, din care face o copie. Îi spuneți și unde sunteți rezident fiscal. Ce vă mai întreabă ca să vă cunoască pe dumneavoastră și contul (adresa, munca, veniturile) urmează o listă pe care textele o numesc orientativă și o potrivesc riscului, așa că fiecare bancă o fixează pe a ei. Dacă refuză, vă dă gratuit motivele. Puteți cere apoi Băncii Franței să numească o bancă obligată să vă deschidă un cont, cu o listă închisă de acte.",
    "Die Regeln gegen Geldwäsche legen es fest. Vor der Kontoeröffnung erfasst die Bank Name, Vornamen, Geburtsdatum und -ort und prüft sie am Original eines gültigen amtlichen Dokuments mit Lichtbild, von dem sie eine Kopie nimmt. Außerdem nennen Sie Ihre steuerliche Ansässigkeit. Was sie sonst fragt, um Sie und das Konto zu kennen (Anschrift, Beruf, Einkommen), folgt einer Liste, die die Texte als beispielhaft bezeichnen und dem Risiko anpassen, sodass jede Bank ihre eigene festlegt. Lehnt sie ab, nennt sie kostenlos die Gründe. Sie können dann die Banque de France bitten, eine Bank zu bestimmen, die Ihnen ein Konto eröffnen muss, mit einer abschließenden Liste von Unterlagen.",
    `Les règles contre le blanchiment le fixent. Avant d’ouvrir un compte, la banque relève vos nom, prénoms, date et lieu de naissance et les vérifie sur l’original d’un document officiel en cours de validité comportant votre photographie, dont elle prend une copie. Vous lui donnez aussi votre résidence fiscale. Ce qu’elle demande en plus pour vous connaître et connaître le compte (adresse, profession, revenus) suit une liste que les textes disent indicative et adaptent au risque${N}: chaque banque fixe la sienne. Si elle refuse, elle vous en donne gratuitement les motifs. Vous pouvez alors demander à la Banque de France de désigner une banque tenue de vous ouvrir un compte, avec une liste limitative de pièces.`),
  descriere: t(
    "What a bank in France must record and check before opening an account, what else it may ask, and your right to an account through the Banque de France.",
    "Ce notează și verifică o bancă din Franța înainte de a deschide un cont, ce mai poate cere și dreptul dumneavoastră la un cont prin Banca Franței.",
    "Was eine Bank in Frankreich vor der Kontoeröffnung erfasst und prüft, was sie sonst fragen darf, und Ihr Recht auf ein Konto über die Banque de France.",
    `Ce que la banque relève et vérifie avant d’ouvrir un compte, ce qu’elle peut demander en plus, et votre droit au compte par la Banque de France.`),
  permise: [
    {
      sectiune: t("Who you are", "Cine sunteți", "Wer Sie sind", "Votre identité"),
      grupuri: [
        { titlu: t("Recorded", "Se notează", "Erfasst", "Relevé"), elemente: [
          { t: t("name and first names, date and place of birth", "numele și prenumele, data și locul nașterii", "Name und Vornamen, Geburtsdatum und -ort", "nom et prénoms, date et lieu de naissance"), o: "le recueil de ses nom et prénoms, ainsi que de ses date et lieu de naissance" },
        ] },
        { titlu: t("Checked", "Se verifică", "Geprüft", "Vérifié"), cate: t("one of", "unul dintre", "eines davon", "l’une des modalités"), elemente: [
          { t: t("in person: the original of a valid official paper with your photo, of which the bank takes a copy", "în persoană: originalul unui act oficial valabil cu fotografia dumneavoastră, din care banca face o copie", "persönlich: das Original eines gültigen amtlichen Dokuments mit Lichtbild, von dem die Bank eine Kopie nimmt", `en personne${N}: l’original d’un document officiel en cours de validité comportant votre photographie, dont la banque prend une copie`), o: "la présentation de l’original d’un document officiel en cours de validité comportant sa photographie et par la prise d’une copie de ce document" },
          { t: t("an electronic ID certified by France's cybersecurity agency (ANSSI), or notified by an EU state, at a substantial or high level", "o identitate electronică certificată de agenția franceză de securitate cibernetică (ANSSI) sau notificată de un stat UE, de nivel substanțial sau ridicat", "eine elektronische Identität, von der französischen Cybersicherheitsbehörde (ANSSI) zertifiziert oder von einem EU-Staat notifiziert, auf substanziellem oder hohem Niveau", "un moyen d’identification électronique certifié par l’ANSSI, ou notifié par un État de l’Union, de niveau substantiel ou élevé") },
          { t: t("an electronic identification means presumed reliable under French law", "un mijloc de identificare electronică prezumat fiabil după legea franceză", "ein nach französischem Recht als zuverlässig vermutetes elektronisches Identifizierungsmittel", "un moyen d’identification électronique présumé fiable au sens du code des postes et des communications électroniques") },
        ] },
        { titlu: t("Otherwise", "Altfel", "Andernfalls", "À défaut"), cate: t("at least two of", "cel puțin două dintre", "mindestens zwei davon", "au moins deux mesures parmi"), elemente: [
          { t: t("a copy of such a paper", "o copie a unui astfel de act", "eine Kopie eines solchen Dokuments", "une copie d’un tel document") },
          { t: t("that copy checked and certified by an independent third party", "copia verificată și certificată de un terț independent", "diese Kopie, von einem unabhängigen Dritten geprüft und bestätigt", "la vérification et la certification de cette copie par un tiers indépendant") },
          { t: t("a first payment from or to an account in your name in the EU or the EEA, or a country with equal rules", "o primă plată dintr-un cont sau către un cont pe numele dumneavoastră în UE ori SEE, sau într-o țară cu reguli echivalente", "eine erste Zahlung von oder auf ein Konto auf Ihren Namen in der EU, im EWR oder in einem Land mit gleichwertigen Regeln", "un premier paiement en provenance ou à destination d’un compte ouvert à votre nom dans l’Union, l’EEE ou un pays aux règles équivalentes"), o: "Exiger que le premier paiement des opérations soit effectué en provenance ou à destination d’un compte ouvert au nom du client" },
          { t: t("a confirmation of your identity straight from a regulated third party", "o confirmare a identității dumneavoastră direct de la un terț reglementat", "eine Bestätigung Ihrer Identität direkt durch einen beaufsichtigten Dritten", "une confirmation de votre identité obtenue directement d’un tiers soumis aux mêmes obligations") },
          { t: t("an identity check by a service certified by ANSSI", "o verificare a identității printr-un serviciu certificat de ANSSI", "eine Identitätsprüfung durch einen von der ANSSI zertifizierten Dienst", "une vérification d’identité par un service certifié par l’ANSSI") },
          { t: t("an advanced or qualified electronic signature", "o semnătură electronică avansată sau calificată", "eine fortgeschrittene oder qualifizierte elektronische Signatur", "une signature électronique avancée ou qualifiée") },
        ] },
      ],
    },
    {
      sectiune: t("Knowing you and the account", "Cunoașterea dumneavoastră și a contului", "Sie und das Konto kennen", "Connaissance du client et du compte"),
      grupuri: [{ titlu: t("May be collected", "Se poate cere", "Darf erhoben werden", "Peuvent être recueillis"), cate: t("an indicative list, adapted to the risk", "o listă orientativă, pe măsura riscului", "eine beispielhafte Liste, je nach Risiko", "une liste indicative, adaptée au risque"), elemente: [
        { t: t("the amount and nature of the operations you plan", "suma și natura operațiunilor pe care le plănuiți", "Betrag und Art der geplanten Geschäfte", "le montant et la nature des opérations envisagées") },
        { t: t("where the money comes from and where it goes", "de unde vin banii și unde merg", "Herkunft und Bestimmung der Gelder", "la provenance et la destination des fonds") },
        { t: t("the reason you give for the account, or how you plan to use it", "motivul pe care îl dați pentru cont sau cum doriți să-l folosiți", "der angegebene Zweck des Kontos oder seine geplante Nutzung", "la justification économique déclarée ou le fonctionnement envisagé du compte") },
        { t: t("proof of your current home address; the anti-money-laundering rules do not require it", "o dovadă a adresei actuale de domiciliu; regulile împotriva spălării banilor nu o fac obligatorie", "ein Nachweis der aktuellen Wohnanschrift; die Regeln gegen Geldwäsche machen ihn nicht zur Pflicht", `un justificatif de l’adresse actuelle du domicile${N}; les règles contre le blanchiment ne le rendent pas obligatoire`), o: "Le recueil d’un tel justificatif n’est donc pas indispensable" },
        { t: t("the work you do now", "activitatea profesională actuală", "die derzeit ausgeübte berufliche Tätigkeit", "les activités professionnelles actuellement exercées") },
        { t: t("your income, or anything that shows your other resources", "veniturile sau orice arată celelalte resurse", "Einkommen oder Angaben zu anderen Mitteln", "les revenus ou tout élément permettant d’estimer les autres ressources") },
        { t: t("anything that helps assess your assets", "orice ajută la aprecierea averii", "Angaben zur Einschätzung des Vermögens", "tout élément permettant d’apprécier le patrimoine") },
        { t: t("for a politically exposed person: the office held, or the ties with such a person", "pentru o persoană expusă politic: funcția sau legăturile cu o asemenea persoană", "bei politisch exponierten Personen: das Amt oder die Verbindung zu einer solchen Person", `pour une personne politiquement exposée${N}: les fonctions ou les liens avec cette personne`) },
      ] }],
    },
    {
      sectiune: t("Tax", "Fiscal", "Steuern", "Fiscalité"),
      grupuri: [{ titlu: t("You give", "Declarați", "Sie geben an", "Vous remettez"), elemente: [
        { t: t("your countries of tax residence and, where relevant, your tax numbers", "țările de rezidență fiscală și, dacă e cazul, numerele fiscale", "Ihre Staaten der steuerlichen Ansässigkeit und gegebenenfalls Ihre Steuernummern", "vos résidences fiscales et, le cas échéant, vos numéros d’identification fiscale"), o: "les informations nécessaires à l’identification de leurs résidences fiscales et, le cas échéant, de leurs numéros d’identification fiscale" },
      ] }],
    },
    {
      sectiune: t("If banks refuse: the right to an account, through the Banque de France", "Dacă băncile refuză: dreptul la cont, prin Banca Franței", "Wenn Banken ablehnen: Recht auf ein Konto, über die Banque de France", `Si les banques refusent${N}: le droit au compte, par la Banque de France`),
      grupuri: [
        { titlu: t("Identity", "Identitate", "Identität", "Identité"), cate: t("a copy of both sides, valid, with a photo, for example one of", "o copie față-verso, valabilă, cu fotografie, de exemplu unul dintre", "eine Kopie von Vorder- und Rückseite, gültig, mit Lichtbild, etwa eines davon", "une copie recto verso, en cours de validité, avec photographie, notamment l’un des documents suivants"), elemente: [
          { t: t("ID card, French or foreign", "carte de identitate, franceză sau străină", "Personalausweis, französisch oder ausländisch", "carte nationale d’identité française ou étrangère") },
          { t: t("passport, French or foreign", "pașaport, francez sau străin", "Reisepass, französisch oder ausländisch", "passeport français ou étranger") },
          { t: t("driving licence, French or foreign", "permis de conducere, francez sau străin", "Führerschein, französisch oder ausländisch", "permis de conduire français ou étranger") },
          { t: t("a veteran's card, or an ID or travel card from the French military authorities", "carnetul de combatant sau o carte de identitate ori de circulație de la autoritățile militare franceze", "Kriegsteilnehmerausweis oder Ausweis bzw. Fahrkarte der französischen Militärbehörden", "carte de combattant, carte d’identité ou carte de circulation délivrée par les autorités militaires françaises") },
          { t: t("the receipt of an application for a residence permit", "recipisa cererii de permis de ședere", "Bestätigung über den Antrag auf einen Aufenthaltstitel", "récépissé de demande d’un titre de séjour") },
          { t: t("a temporary residence card, a resident card, or an EU or EEA national's card", "un permis de ședere temporară, o carte de rezident sau cartea de cetățean UE ori SEE", "befristete Aufenthaltskarte, Daueraufenthaltskarte oder Karte für EU- bzw. EWR-Bürger", "carte de séjour temporaire, carte de résident, carte de ressortissant de l’Union ou de l’EEE") },
        ] },
        { titlu: t("Home address", "Domiciliu", "Wohnsitz", "Domicile"), cate: t("a copy of one, in your name", "o copie a unuia, pe numele dumneavoastră", "eine Kopie eines davon, auf Ihren Namen", "la copie de l’un des justificatifs suivants, à votre nom"), elemente: [
          { t: t("a rent receipt under three months old", "o chitanță de chirie mai nouă de trei luni", "eine Mietquittung, nicht älter als drei Monate", "quittance de loyer de moins de trois mois") },
          { t: t("a water, gas, electricity, internet or phone bill under three months old", "o factură de apă, gaz, curent, internet sau telefon mai nouă de trei luni", "eine Wasser-, Gas-, Strom-, Internet- oder Telefonrechnung, nicht älter als drei Monate", "facture d’eau, de gaz, d’électricité, d’internet ou de téléphone de moins de trois mois") },
          { t: t("a home insurance certificate under three months old", "o poliță de asigurare a locuinței mai nouă de trei luni", "eine Wohnungsversicherungsbescheinigung, nicht älter als drei Monate", "attestation d’assurance logement de moins de trois mois") },
          { t: t("a certificate of postal address from an approved body", "o adeverință de domiciliu poștal de la un organism autorizat", "eine Postanschriftsbescheinigung einer zugelassenen Stelle", "attestation d’élection de domicile") },
          { t: t("your host's sworn statement, with the host's ID and proof of address under three months old", "declarația pe proprie răspundere a gazdei, cu actul de identitate și dovada de domiciliu ale gazdei, mai noi de trei luni", "die eidesstattliche Erklärung des Gastgebers, mit dessen Ausweis und Wohnsitznachweis, nicht älter als drei Monate", "attestation sur l’honneur de l’hébergeant, avec sa pièce d’identité et son justificatif de domicile de moins de trois mois") },
          { t: t("a valid travel booklet (livret de circulation)", "un carnet de circulație valabil (livret de circulation)", "ein gültiges Reiseheft (livret de circulation)", "livret de circulation en cours de validité") },
          { t: t("the last income tax notice", "ultima decizie de impunere", "der letzte Steuerbescheid", "dernier avis d’imposition ou de non-imposition") },
          { t: t("the title deed of your main home", "actul de proprietate al locuinței principale", "der Eigentumsnachweis der Hauptwohnung", "titre de propriété de la résidence principale") },
        ] },
        { titlu: t("Also", "În plus", "Außerdem", "Et aussi"), elemente: [
          { t: t("the bank's refusal letter, or proof that you asked over fifteen days ago (a registered letter's receipt or proof of delivery by hand)", "scrisoarea de refuz a băncii sau dovada că ați cerut acum mai bine de cincisprezece zile (confirmarea scrisorii recomandate sau dovada predării în mână)", "das Ablehnungsschreiben der Bank oder der Nachweis, dass Sie vor über fünfzehn Tagen angefragt haben (Rückschein des Einschreibens oder Nachweis der persönlichen Abgabe)", "la lettre de refus d’ouverture de compte, ou l’accusé de réception de la lettre recommandée ou la preuve du dépôt en main propre de la demande, datant de plus de quinze jours") },
          { t: t("a sworn statement that you have no deposit account, personal or professional", "o declarație pe proprie răspundere că nu aveți niciun cont de depozit, personal sau profesional", "eine eidesstattliche Erklärung, dass Sie kein privates oder berufliches Einlagenkonto haben", "une déclaration sur l’honneur attestant que vous ne disposez d’aucun compte de dépôt, à titre personnel ou professionnel") },
          { t: t("only if you act as a professional: a register extract, the INSEE certificate or the professional card", "doar dacă acționați ca profesionist: un extras din registru, certificatul INSEE sau legitimația profesională", "nur bei beruflicher Tätigkeit: Registerauszug, INSEE-Bescheinigung oder Berufsausweis", `seulement à titre professionnel${N}: un extrait d’immatriculation, le certificat de l’INSEE ou la carte professionnelle`) },
        ] },
      ],
    },
  ],
  interzise: {
    titlu: t("What the bank may not do", "Ce nu poate face banca", "Was die Bank nicht darf", "Ce que la banque ne peut pas faire"),
    elemente: [
      { t: t("use these data for other purposes without your consent", "să folosească aceste date în alte scopuri fără acordul dumneavoastră", "diese Daten ohne Ihre Zustimmung für andere Zwecke verwenden", "utiliser ces informations à d’autres fins sans votre accord") },
      { t: t("ask without telling you why, how the data will be used and what happens if you do not answer", "să ceară fără să vă spună de ce, cum vor fi folosite datele și ce se întâmplă dacă nu răspundeți", "fragen, ohne zu sagen, warum, wie die Daten verwendet werden und was geschieht, wenn Sie nicht antworten", "demander sans vous dire pourquoi, comment les données seront utilisées et ce qu’entraîne un défaut de réponse") },
      { t: t("accept an expired ID", "să accepte un act de identitate expirat", "einen abgelaufenen Ausweis akzeptieren", "accepter une pièce d’identité périmée"), o: "Les organismes financiers n’acceptent pas la présentation de documents périmés" },
      { t: t("refuse the account without giving you its reasons, free of charge and on paper", "să refuze contul fără să vă dea motivele, gratuit și pe hârtie", "das Konto ablehnen, ohne Ihnen die Gründe kostenlos und auf Papier zu nennen", "refuser le compte sans vous en donner les motifs, gratuitement et sur papier"), o: "il fournit au demandeur gratuitement, sur support papier, … les motifs de ce refus" },
    ],
  },
  cerute: [
    t("Valid official ID with a photo (ID card, passport or residence permit)", "Act de identitate oficial valabil, cu fotografie (carte de identitate, pașaport sau permis de ședere)", "Gültiger amtlicher Ausweis mit Lichtbild (Personalausweis, Reisepass oder Aufenthaltstitel)", "Pièce d’identité officielle en cours de validité, avec photo (carte d’identité, passeport ou titre de séjour)"),
    t("Proof of address (tax notice, rent receipt or a recent bill)", "Dovadă de domiciliu (decizie de impunere, chitanță de chirie sau o factură recentă)", "Wohnsitznachweis (Steuerbescheid, Mietquittung oder eine aktuelle Rechnung)", "Justificatif de domicile (avis d’imposition, quittance de loyer ou facture récente)"),
    t("Your work and income", "Activitatea profesională și veniturile", "Beruf und Einkommen", "Profession et revenus"),
    t("Countries of tax residence and tax numbers", "Țările de rezidență fiscală și numerele fiscale", "Staaten der steuerlichen Ansässigkeit und Steuernummern", "Résidences fiscales et numéros d’identification fiscale"),
  ],
  surse: [
    { titlu: "Code monétaire et financier, article R561-5 (identification)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041592220", versiune: [["vigoare", "2020-02-14"]] },
    { titlu: "Code monétaire et financier, article R561-5-1 (vérification de l’identité)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043332956", versiune: [["vigoare", "2021-04-05"]] },
    { titlu: "Code monétaire et financier, article R561-5-2 (mesures complémentaires)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041577229", versiune: [["vigoare", "2020-02-14"]] },
    { titlu: "Code monétaire et financier, article R561-12 (connaissance du client, adaptée au risque)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041592285", versiune: [["vigoare", "2020-02-14"]] },
    { titlu: "Arrêté du 2 septembre 2009 (éléments d’information liés à la connaissance du client)", url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000021017585", versiune: [["vigoare", "2009-09-05"], ["nemodificat"]] },
    { titlu: "Code général des impôts, article 1649 AC (résidence fiscale)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045038087", versiune: [["vigoare", "2023-01-01"]] },
    { titlu: "Code monétaire et financier, article L312-1 (droit au compte)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044605348", versiune: [["vigoare", "2021-12-27"]] },
    { titlu: "Arrêté du 31 juillet 2015 fixant la liste des pièces justificatives (droit au compte)", url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000031024044/", versiune: [t("article 1 in force since 13 June 2022", "articolul 1 în vigoare din 13 iunie 2022", "Artikel 1 in Kraft seit 13. Juni 2022", "article 1 en vigueur depuis le 13 juin 2022")] },
    { titlu: "Service-public.gouv.fr, « Compte bancaire individuel »", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2413", versiune: [["verificat", "2026-05-22"]] },
    { titlu: "Service-public.gouv.fr, « Droit au compte »", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2417", versiune: [["verificat", "2026-10-19"]] },
    { titlu: "CNIL, « Quelles informations personnelles ma banque peut-elle me demander ? »", url: "https://www.cnil.fr/fr/cnil-direct/question/quelles-informations-personnelles-ma-banque-peut-elle-me-demander", versiune: [["fara"]] },
    { titlu: "ACPR, Lignes directrices relatives à l’identification, la vérification de l’identité et la connaissance de la clientèle", url: "https://acpr.banque-france.fr/sites/default/files/media/2022/05/11/20220404_lignes_directrices_revisees_relatives_identification_verification_connaissance.pdf", versiune: [["data", "2021-12-16"], t("an explanatory document", "document explicativ", "erläuterndes Dokument", "document de nature explicative")] },
  ],
  verificat: "2026-10-20",
};

export const TRUSE: Trusa[] = [FR, DE, FR_CONT, DE_CONT, FR_ANGAJARE, DE_ANGAJARE];
export const trusa = (id?: string) => TRUSE.find((x) => x.id === id);
/** A kit's page on the site, in a language. */
export const adresaTrusa = (domeniu: string, x: Trusa, l: Limba) => `${domeniu}/acte/${x.pagina[limbaTrusa(l)]}/`;
/**
 * The kit an ask may name: only while every paper it asks for is one of the kit's, in any of its languages. An ask
 * that adds a paper of its own carries no kit, so the person asked never reads "This ask follows the list" over a
 * paper the list does not have (or forbids). Asking for fewer papers still follows it.
 */
export function trusaUrmata(id: string | undefined, ce: string[]): string | undefined {
  const x = trusa(id);
  if (!x) return undefined;
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const din = new Set(x.cerute.flatMap((c) => Object.values(c).map(norm)));
  return ce.every((c) => !norm(c) || din.has(norm(c))) ? x.id : undefined;
}
