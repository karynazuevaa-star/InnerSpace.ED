// Content for the Psychoeducation brain model. Grounded in published
// eating-disorder neuroscience (search-verified against the actual papers
// below, not written from unverified memory) - each region's text stays
// hedged ("studies find", "consistent with") because most of this
// literature is correlational fMRI research, not settled mechanism. This
// is educational material for a session, not a diagnostic claim about any
// individual client. Prose is written in short plain sentences on purpose
// (periods instead of em dashes or colons) to read like a person wrote it.
export interface BrainRegion {
  id: string; // matches the "region_<id>" mesh name inside /models/brain.glb
  titleRu: string;
  titleEn: string;
  normalRu: string;
  normalEn: string;
  starvationRu: string;
  starvationEn: string;
  edRu: string;
  edEn: string;
  sources: string[];
}

// Short footer note, shown below the whole brain viewer together with the
// license attribution - kept brief on purpose so it doesn't compete with
// the interactive panel for attention.
export const BRAIN_INTRO_RU =
  'Модель основана на реальной анатомии мозга. Для нескольких зон показан ближайший доступный анатомический аналог, а не точная граница. Это учебный материал, не диагностика конкретного человека.';

export const BRAIN_INTRO_EN =
  'This model is based on real brain anatomy. For a few zones, the closest available anatomical match is shown rather than an exact boundary. This is educational material, not a diagnosis of any individual.';

// Attribution required by the CC BY-SA license the underlying 3D data
// ships under - shown together with BRAIN_INTRO_RU/EN below the viewer.
export const BRAIN_ATTRIBUTION_RU =
  'Геометрия модели мозга взята из BodyParts3D (The Database Center for Life Science, CC BY-SA 2.1 Japan) и Z-Anatomy (CC BY-SA 4.0), с изменениями.';
export const BRAIN_ATTRIBUTION_EN =
  'Brain geometry is based on BodyParts3D (The Database Center for Life Science, CC BY-SA 2.1 Japan) and Z-Anatomy (CC BY-SA 4.0), modified.';

export const BRAIN_REGIONS: BrainRegion[] = [
  {
    id: 'hypothalamus',
    titleRu: 'Гипоталамус',
    titleEn: 'Hypothalamus',
    normalRu:
      'Небольшая структура в глубине мозга. Она переводит сигналы тела (уровень гормонов лептина, грелина и инсулина) в ощущения голода и сытости. За это отвечают две противоположные группы нейронов дугообразного ядра. Одни (AgRP/NPY) запускают чувство голода, другие (POMC) сигнализируют о насыщении.',
    normalEn:
      "A small deep-brain structure. It translates the body's hormonal signals (leptin, ghrelin, insulin) into the felt sense of hunger and fullness. Two opposing neuron populations in the arcuate nucleus do this. AgRP/NPY neurons drive hunger, POMC neurons signal fullness.",
    starvationRu:
      'При дефиците энергии уровень лептина падает, а грелина растёт. Это сильно активирует «голодные» AgRP/NPY-нейроны и подавляет «сытые» POMC-нейроны. Это нормальная, адаптивная реакция организма. Чем дольше человек недоедает, тем настойчивее гипоталамус сигнализирует о необходимости есть.',
    starvationEn:
      "During an energy deficit, leptin drops and ghrelin rises, strongly activating the 'hungry' AgRP/NPY neurons and suppressing the 'full' POMC neurons. This is a normal, adaptive response. The longer someone under-eats, the more insistently the hypothalamus signals the need to eat.",
    edRu:
      'При РПП, особенно при нервной анорексии, этот физиологический сигнал голода обычно никуда не исчезает. Проблема не в том, что гипоталамус «сломан», а в том, что его сигнал систематически подавляется вышестоящими корковыми структурами контроля (см. префронтальную кору и переднюю поясную кору). Ощущение голода может подавляться настолько успешно, что человек перестаёт его субъективно замечать.',
    edEn:
      "In eating disorders, especially anorexia nervosa, this physiological hunger signal usually isn't gone. The issue isn't a \"broken\" hypothalamus, but that its signal is being systematically overridden by higher cortical control circuits (see the prefrontal cortex and anterior cingulate cortex). Hunger can be suppressed so effectively that a person stops consciously registering it.",
    sources: [
      'Arcuate Nucleus-Dependent Regulation of Metabolism — Pathways to Obesity and Diabetes Mellitus, Endocrine Reviews, 2022',
      'Kaye W.H., Fudge J.L., Paulus M. — New insights into symptoms and neurocircuit function of anorexia nervosa, Nature Reviews Neuroscience, 2009',
    ],
  },
  {
    id: 'insula',
    titleRu: 'Островковая доля',
    titleEn: 'Insula',
    normalRu:
      'Основная зона интероцепции. Она собирает и интегрирует сигналы от внутренних органов (сердцебиение, дыхание, наполненность желудка) и от вкусовых рецепторов, превращая их в целостное ощущение того, что происходит внутри тела.',
    normalEn:
      "The brain's primary interoceptive cortex. It gathers and integrates signals from internal organs (heartbeat, breathing, stomach fullness) and from taste, turning them into a coherent felt sense of what's happening inside the body.",
    starvationRu:
      'Во время голода работа островковой доли меняется. После продолжительного голодания её передняя часть сильнее реагирует на изображения еды, а связи островковой доли с другими областями мозга перестраиваются. Вероятно, так недостаток энергии делает сигналы, связанные с пищей, более заметными и значимыми.',
    starvationEn:
      "During starvation, the insula's activity changes. After extended fasting, its anterior part responds more strongly to images of food, and the insula's connections with other brain regions reorganize. This is thought to be how an energy deficit makes food-related signals more salient and significant.",
    edRu:
      'При нервной анорексии исследования многократно находят изменённую активность островковой доли при обработке телесных и вкусовых сигналов, а также при взгляде на собственное тело. Это согласуется с клинически описанным «интероцептивным дефицитом», трудностью точно ощущать и интерпретировать голод, сытость и другие телесные сигналы, характерной для расстройства.',
    edEn:
      'In anorexia nervosa, studies repeatedly find altered insula activity when processing bodily and taste signals, and when viewing one\'s own body. This matches the clinically described "interoceptive deficit," the difficulty accurately sensing and interpreting hunger, fullness, and other body signals that is central to the disorder.',
    sources: [
      'Kerem L. et al. — Modulation of neural fMRI responses to visual food cues by overeating and fasting interventions: A preliminary study, Physiological Reports, 2021',
      'Wright H. et al. — Differential effects of hunger and satiety on insular cortex and hypothalamic functional connectivity, European Journal of Neuroscience, 2016',
      'Anorexia nervosa as a disorder of the subcortical–cortical interoceptive-self, PMC, 2022',
      'Altered Insula Activity during Visceral Interoception in Weight-Restored Patients with Anorexia Nervosa, Neuropsychopharmacology, 2015',
    ],
  },
  {
    id: 'amygdala',
    titleRu: 'Миндалевидное тело',
    titleEn: 'Amygdala',
    normalRu:
      'Обрабатывает эмоциональную значимость и угрозу, запускает реакцию страха и тревоги на стимулы, которые мозг научился считать опасными.',
    normalEn: 'Processes emotional salience and threat, and triggers fear and anxiety responses to stimuli the brain has learned to treat as dangerous.',
    starvationRu:
      'Хронический энергодефицит и связанный с ним стресс в целом повышают базовую реактивность систем обработки угрозы. Это описано в исследованиях стресса и голодания в целом, не только при РПП.',
    starvationEn:
      'Chronic energy deficit and the stress that comes with it generally heighten the baseline reactivity of threat-processing systems. This is documented in starvation and stress research broadly, not only in eating disorders.',
    edRu:
      'При нервной анорексии нейровизуализация раз за разом обнаруживает повышенную активацию миндалевидного тела в ответ на изображения еды и даже на сам процесс приёма пищи. Это соответствует переживанию еды как угрозы. Более выраженная тревожность связана с более сильным откликом миндалевидного тела на пищевые и вкусовые стимулы.',
    edEn:
      'In anorexia nervosa, neuroimaging repeatedly finds amygdala hyperactivation to food images and even to the act of eating itself, consistent with food being experienced as threatening. Higher trait anxiety is linked to a stronger amygdala response to food and taste-related cues.',
    sources: [
      'Amygdala and anorexia nervosa: a narrative review, Journal of Psychopathology',
      'Trait anxiety is associated with amygdala expectation and caloric taste receipt response across eating disorders, Neuropsychopharmacology, 2022',
    ],
  },
  {
    id: 'ofc',
    titleRu: 'Орбитофронтальная кора',
    titleEn: 'Orbitofrontal cortex',
    normalRu:
      'Оценивает ценность вознаграждения, в том числе еды, и участвует в принятии решений, взвешивая ожидаемое удовольствие и контекст.',
    normalEn: 'Evaluates the value of a reward, including food, and contributes to decision-making by weighing expected pleasure against context.',
    starvationRu:
      'При отрицательном энергетическом балансе у здоровых людей отклик системы вознаграждения на еду обычно усиливается. Это часть нормального механизма, который мотивирует искать и есть пищу при её нехватке.',
    starvationEn:
      'Under a negative energy balance, healthy brains typically show a stronger reward-system response to food. This is part of the normal mechanism that motivates seeking and eating food when it is scarce.',
    edRu:
      'При нервной анорексии картина иная. Ряд исследований находит не усиленный, а изменённый или ослабленный отклик на пищевые стимулы, тогда как реакция на образы худого тела может быть, наоборот, усилена. Это говорит о том, что обычный сигнал «ешь, ты истощён» у части пациентов подменяется вознаграждением за худобу и ограничение.',
    edEn:
      'In anorexia nervosa the picture is different. Several studies find a blunted or altered response to food cues, rather than a heightened one, while the response to images of thin bodies can be stronger instead. This suggests the usual "eat, you\'re depleted" signal is, for some patients, replaced by a reward for thinness and restriction.',
    sources: [
      'Wagner A. et al. — Altered Reward Processing in Women Recovered From Anorexia Nervosa, American Journal of Psychiatry, 2007',
      'Val-Laillet D. et al. — Neuroimaging and neuromodulation approaches to study eating behavior and prevent and treat eating disorders and obesity, NeuroImage: Clinical, 2015',
    ],
  },
  {
    id: 'striatum',
    titleRu: 'Стриатум и прилежащее ядро',
    titleEn: 'Striatum & nucleus accumbens',
    normalRu:
      'Ядро дофаминовой системы вознаграждения. Закрепляет поведение, которое оказалось приятным или полезным, включая приём пищи, и при повторении может «автоматизировать» его, смещая контроль от осознанного желания к привычке.',
    normalEn:
      "The core of the brain's dopamine reward system. It reinforces behavior that turns out to be pleasurable or useful, including eating, and with repetition can turn it into automatic habit rather than conscious desire.",
    starvationRu: 'В норме нехватка пищи и её предвкушение усиливают дофаминовый сигнал, направленный на поиск и добывание еды.',
    starvationEn: 'Normally, food scarcity and the anticipation of food increase dopaminergic signaling aimed at seeking and obtaining food.',
    edRu:
      'При нервной анорексии исследования находят изменённый отклик прилежащего ядра на еду и на образы тела. Например, реакция на изображения истощённого тела может быть сильнее, чем на саму еду. Есть данные, что само ограничение в питании и чрезмерная физическая нагрузка могут закрепляться этой же системой вознаграждения, что помогает объяснить, почему ограничение может ощущаться не как лишение, а как что-то приносящее облегчение или удовлетворение.',
    edEn:
      'In anorexia nervosa, studies find an altered nucleus accumbens response to food and body-image cues. For example, the response to images of an underweight body can be stronger than the response to food itself. There is evidence that restriction and excessive exercise can themselves become reinforced by this same reward system, which helps explain why restricting can feel less like deprivation and more like relief or satisfaction.',
    sources: [
      'A Neural Signature of Anorexia Nervosa in the Ventral Striatal Reward System, American Journal of Psychiatry, 2009',
      'Dysregulation of Brain Reward Systems in Eating Disorders: Neurochemical Information from Animal Models of Binge Eating, Bulimia Nervosa, and Anorexia Nervosa, PMC',
    ],
  },
  {
    id: 'acc',
    titleRu: 'Передняя поясная кора',
    titleEn: 'Anterior cingulate cortex (ACC)',
    normalRu:
      'Отслеживает конфликт между конкурирующими целями и реакциями (например, «я голоден» против «я планировал не есть сейчас») и подключает когнитивный контроль, чтобы этот конфликт разрешить.',
    normalEn:
      "Monitors conflict between competing goals and responses (for example, \"I'm hungry\" versus \"I planned not to eat right now\") and recruits cognitive control to resolve it.",
    starvationRu:
      'У здорового голодного человека вид еды кратковременно усиливает активность контролирующих контуров, включая переднюю поясную кору. Это помогает уместно регулировать порыв поесть, а затем активность снижается, когда человек приступает к еде.',
    starvationEn:
      'In a healthy hungry person, the sight of food briefly increases activity in control circuits, including the ACC, helping appropriately regulate the urge to eat. Activity then settles once eating begins.',
    edRu:
      'При нервной анорексии дорсальная передняя поясная кора демонстрирует повышенную и более устойчивую активацию вокруг решений, связанных с едой, что соответствует избыточному, требующему усилий когнитивному контролю над питанием. Этот паттерн отмечается у пациентов в остром состоянии болезни и частично сохраняется даже после восстановления веса.',
    edEn:
      'In anorexia nervosa, the dorsal ACC shows heightened, more persistent activation around food-related decisions, consistent with excessive, effortful cognitive control being exerted over eating. This pattern is seen in acutely ill patients and partly persists even after weight restoration.',
    sources: [
      'Increased anterior cingulate cortex response precedes behavioural adaptation in anorexia nervosa, Scientific Reports, 2017',
      'Cognitive control & the anterior cingulate cortex: Necessity & coherence, PMC',
    ],
  },
  {
    id: 'dlpfc',
    titleRu: 'Дорсолатеральная префронтальная кора',
    titleEn: 'Dorsolateral prefrontal cortex (dlPFC)',
    normalRu: 'Отвечает за планирование, следование правилам и сознательный контроль над импульсами. Это часть «исполнительных функций» мозга.',
    normalEn: "Supports planning, rule-following, and conscious control over impulses. This is part of the brain's \"executive function\" system.",
    starvationRu:
      'Острое тяжёлое голодание ухудшает концентрацию и исполнительные функции в целом. Из-за нехватки энергии страдает сама способность мозга ясно мыслить и выполнять сложные задачи, что было хорошо задокументировано ещё в классическом Миннесотском эксперименте по голоданию.',
    starvationEn:
      "Acute severe starvation impairs concentration and executive function generally. The brain's own capacity for clear thinking and complex tasks suffers from the energy shortfall, well documented as far back as the classic Minnesota Starvation Experiment.",
    edRu:
      'При этом при нервной анорексии активность и связность дорсолатеральной префронтальной коры с зонами вознаграждения часто оказываются повышенными во время задач, связанных с едой и регуляцией эмоций. Это согласуется с клинически описанным паттерном «гиперконтроля», при котором жёсткое следование правилам питания преобладает над гибким реагированием на ситуацию, и связано с ухудшением эмоционального состояния.',
    edEn:
      "Yet in anorexia nervosa, dlPFC activity and its connectivity with reward regions are often found to be elevated during food-related and emotion-regulation tasks. This is consistent with the clinically described pattern of \"over-control,\" where rigid rule-following about food dominates over flexible, in-the-moment responding, and is linked to worse emotional outcomes.",
    sources: [
      'The costs of over-control in anorexia nervosa: evidence from fMRI and ecological momentary assessment, Translational Psychiatry, 2021',
      'Dorsolateral prefrontal cortex and amygdala function during cognitive reappraisal predicts weight restoration and emotion regulation impairment in anorexia nervosa, Psychological Medicine',
    ],
  },
];
