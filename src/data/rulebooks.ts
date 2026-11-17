export interface RulebookPreset {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  sampleQuestions: string[];
  rawText: string;
}

export const RULEBOOK_PRESETS: RulebookPreset[] = [
  {
    id: 'kinetic-2049',
    title: 'Protocole Tactique KINETIC-2049',
    subtitle: 'Règlement officiel d’escarmouche et d’arbitrage de plateau',
    category: 'Jeu tactique',
    sampleQuestions: [
      'Comment fonctionne la ligne de vue et le couvert lourd ?',
      'Que se passe-t-il en cas d’égalité à la fin de la partie ?',
      'Peut-on interrompre le déplacement d’un ennemi avec une réaction ?',
      'Quelle règle prime lorsqu’un effet contredit une permission ?',
    ],
    rawText: `# Chapitre 1 — Mise en place et Structure du Tour

### Art. 1.1 — Déploiement et Zone d’Insertion
Chaque escouade dispose d’une zone de déploiement profonde de 15 cm (6 pouces) le long de son bord de table désigné. Aucune unité ne peut être placée à moins de 20 cm d’un objectif central lors de la phase initiale, sauf mention contraire d’une capacité d’Infiltration.

Exemple : L’unité « Ombre-4 » possède la capacité Infiltration. Elle peut être placée jusqu’à la ligne médiane du plateau, à condition de rester à plus de 15 cm de toute figurine ennemie déjà déployée et hors de sa ligne de vue directe.

### Art. 1.2 — Ordre du Round et Initiative
Un round complet se divise en trois phases successives : Phase de Commandement, Phase d’Activation alternée et Phase de Maintenance. Au début de chaque round, les deux joueurs lancent 1D10 augmenté de la valeur Tactique de leur chef. Le vainqueur choisit s’il active la première unité ou s’il cède l’initiative.

Exemple : La joueuse A obtient 7 + 2 = 9 et le joueur B obtient 8 + 1 = 9. En cas d’égalité au jet d’initiative, le joueur qui n’avait pas l’initiative au round précédent l’emporte automatiquement. Au round 1, on relance le dé.

### Art. 1.3 — Points d’Action (PA) et Activation
Lorsqu’une unité est activée, elle reçoit exactement 3 Points d’Action (PA). Une même action basique (Déplacement, Tir, Recharge) peut être répétée jusqu’à deux fois au cours de la même activation, à l’exception de l’action Sprint qui est limitée à une fois par tour. Les PA non dépensés à la fin de l’activation sont perdus, sauf 1 PA maximum pouvant être converti en jeton de Vigilance.

Exemple : Un agent dépense 1 PA pour se mettre à couvert, 1 PA pour effectuer un Tir de précision, puis conserve son dernier PA sous forme de jeton de Vigilance pour réagir durant le tour adverse.

# Chapitre 2 — Déplacement, Terrains et Ligne de Vue

### Art. 2.1 — Déplacement et Terrains Difficiles
La valeur de Mouvement standard d’un opérateur est de 10 cm par PA dépensé. Traverser un terrain difficile (gravats industriels, eau profonde, câbles enchevêtrés) divise la distance parcourue par deux : chaque centimètre parcouru dans cette zone coûte 2 cm de mouvement.

Exemple : Un opérateur avec 10 cm de Mouvement commence à 4 cm d’une zone de gravats. Il parcourt 4 cm en terrain dégagé, puis dispose de 6 cm restants, ce qui lui permet d’avancer de seulement 3 cm à l’intérieur des gravats.

### Art. 2.2 — Chutes et Dénivelés
Une figurine peut descendre ou sauter d’une passerelle sans pénalité si la hauteur est inférieure ou égale à 5 cm. Entre 5,1 cm et 12 cm, elle subit un jet d’Impact de 1D6 (blessure légère sur 1 à 3) et termine son mouvement au sol. Au-delà de 12 cm, une chute volontaire est interdite sans harnais gravitationnel.

Exemple : Poussé par une onde de choc depuis un toit de 8 cm, un éclaireur tombe dans la ruelle. Le joueur lance 1D6 et obtient 2 : l’éclaireur perd 1 Point de Vie et reçoit l’état À terre.

### Art. 2.3 — Ligne de Vue Réelle et Ombres
Une ligne de vue est établie si l’attaquant peut tracer au moins une ligne droite ininterrompue entre son capteur principal (tête ou optique) et n’importe quelle partie du torse ou des jambes de la cible. Les antennes, armes dépassant et socles ne comptent pas comme des parties valides pour la ligne de vue.

Exemple : Seule la pointe du fusil d’un tireur dépasse derrière un pilier en béton. Comme ni son torse ni ses jambes ne sont visibles, aucune ligne de vue ne peut être tracée contre lui.

### Art. 2.4 — Couvert Léger et Couvert Lourd
Si plus de 30 % de la silhouette de la cible est masquée par un obstacle bas ou un grillage, elle bénéficie d’un Couvert Léger (+1 en Défense). Si plus de 60 % de la silhouette est masquée par un mur plein, un blindage ou une colonne industrielle, elle bénéficie d’un Couvert Lourd (+2 en Défense et annulation des coups critiques à longue portée).

Exemple : Une unité postée derrière un muret métallique voit ses jambes cachées (45 % de la silhouette). Elle obtient un Couvert Léger (+1 en Défense), mais subit normalement les critiques si elle est touchée.

# Chapitre 3 — Combat, Réactions et États

### Art. 3.1 — Réactions Hors-Tour et Interruption
Une unité disposant d’un jeton de Vigilance peut déclencher une Réaction d’interruption lorsqu’une figurine ennemie entre dans sa ligne de vue ou termine un déplacement à moins de 20 cm. La réaction se résout immédiatement après le premier segment de mouvement déclaré, avant que l’ennemi ne puisse effectuer son action suivante.

Exemple : Un drone ennemi dépense 1 PA pour traverser une avenue surveillée. Dès qu’il atteint le milieu de la rue dans le champ de vision du tireur en Vigilance, celui-ci dépense son jeton et résout un Tir immédiat avec un malus de -1 au toucher.

### Art. 3.2 — Résolution des Tirs, Portée et Dispersion
Chaque arme indique sa portée optimale et sa portée maximale. Au-delà de la portée optimale et jusqu’à la portée maximale, le tireur subit un malus de -2 aux dés d’attaque. Les armes à zone d’effet (grenades, lance-flammes) qui ratent leur jet de précision dévient de 1D6 cm dans une direction aléatoire déterminée par la flèche de dispersion.

Exemple : Une grenade lancée à 18 cm manque sa cible de 1 point. Le joueur lance le dé de dispersion et 1D6 (résultat : 4 cm vers le nord-ouest). Le gabarit d’explosion est déplacé de 4 cm avant d’appliquer les dégâts.

### Art. 3.3 — Corps-à-Corps, Riposte et Désengagement
Deux figurines situées à 2 cm ou moins l’une de l’autre sont considérées comme engagées au corps-à-corps. Une figurine engagée ne peut pas effectuer de tir à distance et doit dépenser 2 PA pour se Désengager sans provoquer de frappe gratuite. Si un attaquant frappe au corps-à-corps et échoue à neutraliser sa cible, le défenseur peut effectuer une Riposte gratuite à -1 dé d’attaque.

Exemple : Un cyber-duelliste attaque un garde et lui inflige 2 dégâts, le laissant à 1 PV. Le garde survit et déclenche immédiatement une Riposte gratuite avec 1 dé en moins avant la fin de l’activation du duelliste.

### Art. 3.4 — Surcharge Cybernétique et Effets de Statut (IEM, Brûlure)
Les effets de statut ne se cumulent pas pour un même type, mais s’appliquent indépendamment s’ils sont différents. L’état IEM retire immédiatement 1 PA lors de la prochaine activation et bloque les implants optiques. L’état Brûlure inflige 1 dégât pur au début de chaque Phase de Maintenance tant que l’unité ne dépense pas 1 PA pour éteindre les flammes.

Exemple : Une unité déjà affectée par Brûlure est touchée par une arme IEM. Elle conserve Brûlure et gagne IEM, mais si une seconde grenade IEM la frappe au même tour, elle ne subit pas de second malus de PA.

# Chapitre 4 — Priorité des Règles et Conditions de Victoire

### Art. 4.1 — Hiérarchie et Conflit de Règles
Lorsqu’une règle spéciale ou une carte tactique contredit le livre de règles de base, la règle spécifique l’emporte sur la règle générale. Toutefois, en cas de conflit direct entre deux capacités spéciales, l’interdiction ou la restriction prime toujours sur la permission (« Ne peut pas » l’emporte toujours sur « Peut »).

Exemple : La carte « Charge Fulgurante » indique qu’une unité « peut se désengager gratuitement pour 0 PA ». Mais si cette unité est sous l’effet d’un piège magnétique qui stipule « ne peut pas quitter sa zone d’engagement », l’interdiction l’emporte : elle reste immobilisée.

### Art. 4.2 — Objectifs, Fin de Partie et Départage en cas d’Égalité
La partie s’achève à la fin du 5e round ou dès qu’une escouade est intégralement neutralisée. Le vainqueur est le joueur totalisant le plus de Points de Victoire (PVic). En cas d’égalité stricte de PVic, on départage dans l’ordre suivant : 1) Nombre d’objectifs principaux contrôlés à la fin du round 5 ; 2) Valeur totale en points d’armée des unités adverses détruites ; 3) Nombre d’unités survivantes encore dans la moitié de table adverse.

Exemple : À l’issue du round 5, les deux joueurs comptent 12 PVic et contrôlent chacun 2 objectifs principaux. On passe au deuxième critère : la joueuse A a détruit pour 340 crédits d’unités adverses contre 290 pour le joueur B. La joueuse A remporte la partie.`,
  },
  {
    id: 'code-arbitrage',
    title: 'Code Officiel d’Arbitrage — Tournoi Fédéral',
    subtitle: 'Règlement disciplinaire, chronométrage et résolution des litiges en compétition',
    category: 'Compétition sportive',
    sampleQuestions: [
      'Combien de temps morts sont autorisés par équipe et quelle est leur durée ?',
      'Quelles sanctions s’appliquent après deux fautes techniques ?',
      'Quel est le délai pour déposer une réclamation officielle ?',
      'Comment sont départagées deux équipes ex aequo en phase de poules ?',
    ],
    rawText: `# Titre 1 — Qualification et Engagement des Équipes

### Art. 1.1 — Composition d’Équipe et Feuille de Match
Chaque équipe inscrite doit présenter entre 5 et 12 joueurs licenciés sur la feuille de match officielle au moins 30 minutes avant le coup d’envoi. Tout joueur ne figurant pas sur la feuille validée avant le début de la rencontre ne peut prendre part au jeu.

Exemple : Un remplaçant bloqué dans les transports arrive à la mi-temps. S’il avait été inscrit sur la feuille de match avant le coup d’envoi avec sa licence vérifiée, il peut entrer en jeu ; sinon, il reste en tribune.

### Art. 1.2 — Remplacements et Procédure de Sortie
Les remplacements sont illimités en nombre mais doivent impérativement s’effectuer lors d’un arrêt de jeu validé par la table de marque et dans la zone de substitution dédiée. Le joueur entrant ne peut pénétrer sur l’aire de jeu qu’après la sortie complète du joueur remplacé.

Exemple : Un joueur entre sur le terrain alors que son coéquipier n’a pas encore franchi la ligne de touche. L’arbitre arrête le jeu et inflige un avertissement officiel au banc pour remplacement irrégulier.

# Titre 2 — Chronométrage et Temps Morts

### Art. 2.1 — Durée des Périodes et Prolongations
Une rencontre officielle comprend deux périodes de 25 minutes en temps effectif (chronomètre arrêté à chaque coup de sifflet), séparées par une pause de 10 minutes. En phase à élimination directe, toute égalité à l’issue du temps réglementaire entraîne une prolongation unique de 5 minutes suivie, si nécessaire, d’une séance de tirs de départage.

Exemple : Le score est de 14 à 14 en quart de finale au buzzer final. Après 2 minutes de récupération, les équipes disputent une prolongation de 5 minutes. Si le score reste de 16-16, la séance de départage débute immédiatement.

### Art. 2.2 — Temps Morts Tactiques
Chaque entraîneur dispose de deux temps morts de 60 secondes par rencontre (un maximum en première période, un maximum en seconde période, non cumulables). Un temps mort supplémentaire de 60 secondes est accordé à chaque équipe en cas de prolongation. La demande doit être formulée auprès de la table de marque lorsque son équipe a la possession ou lors d’un arrêt de jeu.

Exemple : Un entraîneur n’a pas utilisé son temps mort en première mi-temps. Il ne dispose tout de même que d’un seul temps mort pour l’ensemble de la seconde période.

# Titre 3 — Fautes, Sanctions et Réclamations

### Art. 3.1 — Faute Technique et Cumul des Sanctions
Une faute technique sanctionne tout comportement antisportif sans contact physique (contestation véhémente, simulation, retard de jeu délibéré). La première faute technique entraîne un avertissement inscrit au procès-verbal et 1 point de pénalité accordé à l’adversaire. Une deuxième faute technique infligée au même joueur ou membre du banc entraîne automatiquement sa disqualification pour le reste du match.

Exemple : Un capitaine déjà sanctionné d’une faute technique en première période conteste avec virulence une décision d’arbitrage à la 40e minute. Il reçoit une seconde faute technique et est immédiatement exclu du terrain et des abords du banc.

### Art. 3.2 — Disqualification et Rapport Disciplinaire
Toute brutalité volontaire, insulte grave ou refus d’obtempérer aux injonctions de l’arbitre principal entraîne une disqualification directe sans avertissement préalable. Le joueur exclu doit quitter l’enceinte sportive dans les 2 minutes et fait l’objet d’un rapport transmis sous 24 heures à la Commission de Discipline.

Exemple : Un joueur qui jette volontairement son équipement en direction d’un officiel est disqualifié sur-le-champ, même s’il n’avait aucune faute antérieure au compteur.

### Art. 3.3 — Réclamation Officielle et Arbitrage Vidéo
Toute réclamation portant sur une erreur d’application du règlement (et non sur une appréciation de fait) doit être signifiée oralement à l’arbitre principal dès l’arrêt de jeu suivant l’incident, puis confirmée par écrit dans les 30 minutes suivant la fin de la rencontre, accompagnée d’une caution réglementaire.

Exemple : La table de marque attribue par erreur 2 points à l’équipe adverse sur un lancer à 1 point et refuse de corriger. Le capitaine pose une réserve immédiate à l’arrêt de jeu et signe le formulaire dans les 30 minutes après le coup de sifflet final.

### Art. 3.4 — Départage en Phase de Poules
En cas d’égalité de points au classement entre deux ou plusieurs équipes à l’issue de la phase de poules, les critères suivants s’appliquent dans l’ordre : 1) Résultat de la confrontation directe (ou classement particulier entre les équipes concernées) ; 2) Différence de points générale sur l’ensemble de la poule ; 3) Plus grand nombre de points marqués ; 4) Nombre le plus faible de fautes techniques cumulées.

Exemple : Les équipes Alpha et Bêta terminent toutes deux avec 9 points au classement. Lors de leur match de poule, Alpha avait battu Bêta 18 à 15. Alpha est donc classée devant Bêta grâce au critère de confrontation directe.`,
  },
  {
    id: 'reglement-copropriete',
    title: 'Règlement Intérieur — Copropriété & Usages',
    subtitle: 'Règles de vie collective, travaux, nuisances sonores et assemblées générales',
    category: 'Règlement administratif',
    sampleQuestions: [
      'À quelles heures sont autorisés les travaux bruyants en semaine et le week-end ?',
      'Peut-on laisser une poussette ou un vélo dans le couloir commun ?',
      'Quelles conditions pour installer une borne de recharge électrique au parking ?',
      'Quelle majorité est requise en assemblée générale pour des travaux d’amélioration ?',
    ],
    rawText: `# Section 1 — Tranquillité, Bruit et Travaux

### Art. 1.1 — Horaires de Tranquillité et Nuisances Sonores
Tout bruit excessif de nature à troubler la tranquillité du voisinage (musique amplifiée, cris, télévision à fort volume, appareils électroménagers bruyants) est interdit entre 22h00 et 7h00 du matin, ainsi que les dimanches et jours fériés toute la journée. Les bruits domestiques ponctuels doivent rester mesurés en journée.

Exemple : Organiser une réception avec musique audible dans les appartements mitoyens après 22h15 constitue un tapage nocturne contraire au règlement, même un vendredi ou samedi soir.

### Art. 1.2 — Travaux Privatifs et Bricolage Bruyant
Les travaux de bricolage ou de rénovation générant des percussions ou vibrations (perceuse, marteau-piqueur, ponceuse) sont strictement limités aux créneaux suivants : du lundi au vendredi de 8h30 à 12h00 et de 14h00 à 19h00 ; le samedi de 9h30 à 12h00 et de 15h00 à 18h00. Ils sont totalement interdits les dimanches et jours fériés. Tout chantier supérieur à 3 jours doit faire l’objet d’un affichage préalable dans le hall 48 heures avant le début.

Exemple : Un copropriétaire qui souhaite refaire sa salle de bain pendant 10 jours affiche un avis dans le hall le lundi pour démarrer le mercredi matin à 8h30, en respectant la coupure méridienne de 12h à 14h.

# Section 2 — Parties Communes, Stationnement et Animaux

### Art. 2.1 — Encombrement des Parties Communes
Les halls d’entrée, paliers, couloirs et cages d’escalier doivent demeurer intégralement libres de tout encombrement pour des raisons de sécurité incendie et d’évacuation. Il est interdit d’y déposer ou stocker des vélos, poussettes, meubles, cartons ou chaussures, même de manière temporaire.

Exemple : Un résident laisse sa trottinette électrique sur le palier du 3e étage devant sa porte. Le syndic est habilité à lui adresser une mise en demeure de retrait sous 24 heures afin de maintenir le passage dégagé.

### Art. 2.2 — Stationnement et Bornes de Recharge Électrique
Les emplacements de parking sont strictement réservés au stationnement des véhicules en état de marche. Tout copropriétaire ou locataire peut solliciter l’exercice de son « droit à la prise » pour installer à ses frais une borne de recharge pour véhicule électrique sur sa place privative, sous réserve d’envoyer une notification technique détaillée au syndic par courrier recommandé au moins 3 mois avant l’installation.

Exemple : Un locataire souhaite installer une prise renforcée de 7,4 kW sur sa place de sous-sol. Il transmet le descriptif technique de l’électricien au propriétaire et au syndic : sauf motif sérieux et légitime (projet collectif déjà voté sous 6 mois), le syndic ne peut s’y opposer.

### Art. 2.3 — Animaux Domestiques
Les animaux domestiques familiers sont tolérés dans les lots privatifs à condition qu’ils ne causent ni dégradation des parties communes, ni trouble de jouissance (aboiements prolongés, odeurs). Dans les ascenseurs, cours et couloirs, les chiens doivent impérativement être tenus en laisse courte.

Exemple : Un chien qui aboie de manière continue durant l’absence de ses maîtres entre 9h et 17h peut faire l’objet d’un rappel au règlement pour trouble anormal de voisinage diurne.

# Section 3 — Gouvernance et Assemblée Générale

### Art. 3.1 — Majorités de Vote en Assemblée Générale
Les décisions courantes d’entretien et d’approbation des comptes se votent à la majorité simple des voix exprimées des copropriétaires présents ou représentés (Article 24). Les travaux d’amélioration, de transformation ou la désignation du syndic requièrent la majorité absolue des voix de tous les copropriétaires (Article 25). Un copropriétaire absent peut confier un mandat de procuration écrit à un mandataire (dans la limite légale de 3 mandats maximum par personne).

Exemple : Lors de l’assemblée générale, la réfection à l’identique de la peinture du hall est votée à la majorité simple des présents (Art. 24), tandis que l’installation d’un système de vidéosurveillance requiert la majorité absolue de l’ensemble des tantièmes (Art. 25).`,
  },
];
