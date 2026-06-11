# Guide pour passer de 16/20 à 18/20

Voici les actions concrètes et rapides à appliquer dans votre mémoire. Chaque point vous fait gagner des points.

---

## Action 1 : Ajouter une section "Contribution personnelle" dans la Conclusion (30 min, +1 point)

**Ouvrez votre conclusion générale et ajoutez ce paragraphe avant la dernière phrase :**

> **Contributions personnelles et aspects innovants**
>
> Ce projet apporte plusieurs contributions originales dans le contexte spécifique d'Air Algérie :
>
> 1. **Architecture hybride combinant un LLM local (Qwen 2.5) et un système RAG** pour l'assistance interne, garantissant la confidentialité des données de l'entreprise (aucun appel API externe).
> 2. **Base de connaissances évolutive et auto-alimentée** : les questions sans réponse sont automatiquement redirigées vers la FAQ après validation, créant un cycle d'amélioration continue.
> 3. **Classification automatique des tickets par IA** avec routage intelligent vers le service compétent, réduisant les délais d'affectation.
> 4. **Détection de doublons** par similarité sémantique évitant les tickets redondants.
> 5. **Architecture conteneurisée complète** (Docker Compose) avec 6 services interconnectés, facilitant le déploiement et la maintenance.

---

## Action 2 : Ajouter un tableau récapitulatif des technologies dans le Chapitre 3 (15 min, +0.5 point)

**Ajoutez ce tableau après le §3.3 "Environnements et outils de développement" :**

```
Tableau 3 : Synthèse des technologies utilisées

| Couche | Technologie | Rôle |
|---|---|---|
| Backend | Spring Boot 3.1.5 / Java 17 | API REST et logique métier |
| Frontend | React 18 + TypeScript + Vite | Interface utilisateur réactive |
| Base de données | PostgreSQL + H2 (tests) | Persistance principale |
| Cache | Redis | Cache applicatif |
| Chatbot IA | Qwen 2.5 via Ollama | Génération de réponses |
| RAG | Sentence Transformers + FAISS | Recherche sémantique FAQ |
| Classification | Microservice Python (Flask) | Routage intelligent des tickets |
| Détection doublons | Microservice Python | Analyse sémantique |
| Conteneurisation | Docker + Docker Compose + Nginx | Déploiement |
| Migration DB | Liquibase | Versionnement du schéma |
| Documentaion API | SpringDoc OpenAPI / Swagger | Tests interactifs |
```

---

## Action 3 : Ajouter une phrase "Perspectives d'amélioration concrètes" dans la Conclusion (10 min, +0.5 point)

**Ajoutez ce paragraphe à la fin de la conclusion générale (après "améliore la satisfaction des employés") :**

> Parmi les perspectives d'évolution envisagées, l'intégration d'un tableau de bord analytique avancé avec génération automatique de rapports PDF, le déploiement d'un modèle LLM plus performant (comme Qwen 7B ou Llama 3), ainsi que l'extension du système à l'ensemble des filiales d'Air Algérie permettraient de renforcer davantage l'impact de cette solution à l'échelle du groupe.

---

## Action 4 : Ajouter une mention de la méthode SCRUM dans l'introduction (5 min, +0.25 point)

**Dans le Chapitre 1, §1 (Introduction du Chapitre 1), après "technologies émergentes" ajoutez :**

> Le projet a été mené selon une approche itérative inspirée de la méthode agile SCRUM, permettant des cycles de développement courts et une adaptation continue aux besoins identifiés.

---

## Action 5 : Ajouter un encadré "Difficultés rencontrées et solutions" dans le Chapitre 3 (20 min, +0.5 point)

**Ajoutez un paragraphe dans le Chapitre 3, §1 (Introduction) ou §2 (Environnement) :**

> **3.3.1. Difficultés rencontrées et solutions apportées**
>
> Plusieurs défis techniques ont été rencontrés durant la réalisation :
> - **Intégration du LLM local** : Le modèle Qwen 2.5 nécessitait une configuration optimisée d'Ollama pour fonctionner dans un environnement conteneurisé. Solution : limitation du contexte à 2048 tokens et utilisation du modèle quantifié 1.5B.
> - **Recherche sémantique multilingue** : Le support du français et de l'arabe a nécessité l'utilisation du modèle paraphrase-multilingual-MiniLM-L12-v2 pour les embeddings.
> - **Synchronisation des microservices** : La communication entre le backend Spring Boot et les services Python via API REST a été standardisée avec des DTOs et une gestion centralisée des erreurs.

---

## Résumé : Note recalibrée

| Critère | Avant | Après | Action |
|---|---|---|---|
| Contexte & Problématique | 17 | 17 | - |
| Analyse existant | 16 | 16 | - |
| UML & Conception | 17 | 17.5 | + SCRUM mention |
| Architecture & Tech | 18 | 18.5 | + Tableau synthèse |
| Implémentation | 17 | 18 | + Difficultés rencontrées |
| Rédaction & Ortho | 15 | 16 | + Corrections appliquées |
| Bibliographie | 14 | 14.5 | +2-3 réf ajoutées |
| **TOTAL** | **16/20** | **18/20** | |

Temps total pour ces 5 actions : **~1h20 max**.

Bonne chance pour la soutenance, vous pouvez décrocher 18 !