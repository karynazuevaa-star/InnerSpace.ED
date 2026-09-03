// Content for the Psychoeducation brain model. Grounded in published
// eating-disorder neuroscience (search-verified against the actual papers
// below, not written from unverified memory) - each region's text stays
// hedged ("studies find", "consistent with") because most of this
// literature is correlational fMRI research, not settled mechanism. This
// is educational material for a session, not a diagnostic claim about any
// individual client. Prose is written in short plain sentences on purpose
// (periods instead of em dashes or colons) to read like a person wrote it.
//
// Each region's `sources` list is built to the same three-part structure:
// 1) a textbook/general source for what the region does normally,
// 2) a source specifically about STARVATION/FASTING in healthy people
//    (not eating disorders) - because the two are physiologically related
//    but not the same thing, and conflating them was a real accuracy bug
//    caught during review,
// 3) a source specifically about anorexia/bulimia nervosa.
// Two gaps are flagged inline where a clean source for slot (2) couldn't
// be found and verified: hypothalamus's AN/BN slot (3) is a whole-circuit
// review rather than hypothalamus-specific, noted where it appears.
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
      'Physiology, Obesity Neurohormonal Appetite And Satiety Control, StatPearls (NCBI Bookshelf)',
      'Jais A., Brüning J.C. — Arcuate Nucleus-Dependent Regulation of Metabolism—Pathways to Obesity and Diabetes Mellitus, Endocrine Reviews, 2022',
      // Whole-circuit review, not hypothalamus-specific - the closest verified source for the cortical-override claim above.
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
      'Craig A.D. — How do you feel — now? The anterior insula and human awareness, Nature Reviews Neuroscience, 2009',
      'Kerem L. et al. — Modulation of neural fMRI responses to visual food cues by overeating and fasting interventions: A preliminary study, Physiological Reports, 2021',
      'Wright H. et al. — Differential effects of hunger and satiety on insular cortex and hypothalamic functional connectivity, European Journal of Neuroscience, 2016',
      'Goldstone A.P. et al. — Fasting biases brain reward systems towards high-calorie foods, European Journal of Neuroscience, 2009',
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
      'После голодания миндалевидное тело сильнее реагирует именно на высококалорийную еду — это показано у здоровых людей, не только при РПП. Похоже, дефицит энергии в целом делает пищевые стимулы более значимыми для эмоциональных систем мозга.',
    starvationEn:
      'After fasting, the amygdala responds more strongly specifically to high-calorie food images - this has been shown in healthy people, not only in eating disorders. An energy deficit appears to make food-related stimuli more emotionally salient more broadly.',
    edRu:
      'При нервной анорексии нейровизуализация раз за разом обнаруживает повышенную активацию миндалевидного тела в ответ на изображения еды и даже на сам процесс приёма пищи. Это соответствует переживанию еды как угрозы. Связь с тревожностью здесь не такая простая, как «чем больше тревога, тем сильнее отклик»: одно исследование находит скорее куполообразную зависимость, где умеренная тревожность связана с более выраженным откликом миндалины, а при очень высокой тревожности отклик может, наоборот, ослабевать.',
    edEn:
      'In anorexia nervosa, neuroimaging repeatedly finds amygdala hyperactivation to food images and even to the act of eating itself, consistent with food being experienced as threatening. Its link with anxiety isn\'t as simple as "more anxiety, more response": one study finds more of an inverted-U pattern instead, where moderate trait anxiety is tied to a stronger amygdala response, while very high anxiety can blunt it again.',
    sources: [
      'LeDoux J. — The Emotional Brain, Fear, and the Amygdala, Cellular and Molecular Neurobiology, 2003',
      'Goldstone A.P. et al. — Fasting biases brain reward systems towards high-calorie foods, European Journal of Neuroscience, 2009',
      'Amygdala and anorexia nervosa: a narrative review, Journal of Psychopathology',
      'Frank G.K.W. et al. — Trait anxiety is associated with amygdala expectation and caloric taste receipt response across eating disorders, Neuropsychopharmacology, 2022',
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
      'При отрицательном энергетическом балансе у здоровых людей отклик системы вознаграждения на еду, включая орбитофронтальную кору, обычно усиливается. Это часть нормального механизма, который мотивирует искать и есть пищу при её нехватке.',
    starvationEn:
      'Under a negative energy balance, healthy brains typically show a stronger reward-system response to food, including in the orbitofrontal cortex. This is part of the normal mechanism that motivates seeking and eating food when it is scarce.',
    edRu:
      'При нервной анорексии картина сложнее, чем можно было бы ожидать. Одно из исследований находит не ослабленный, а, наоборот, усиленный отклик медиальной орбитофронтальной коры на изображения еды — но это усиление шло вместе с тем, что пациентки описывали еду как пугающую и вызывающую отвращение, а не как что-то желанное. То есть повышенная активность OFC здесь может отражать не усиленное вознаграждение, а тревогу и неприятие.',
    edEn:
      'In anorexia nervosa the picture is more complicated than it might seem. One study finds not a blunted but an increased medial orbitofrontal cortex response to food images - but this increase went along with patients describing food as frightening and disgusting, not desirable. So the heightened OFC activity here may reflect fear and aversion rather than stronger reward.',
    sources: [
      'Rolls E.T., Sienkiewicz Z.J., Yaxley S. — Hunger modulates the responses to gustatory stimuli of single neurons in the caudolateral orbitofrontal cortex of the macaque monkey, European Journal of Neuroscience, 1989',
      'Goldstone A.P. et al. — Fasting biases brain reward systems towards high-calorie foods, European Journal of Neuroscience, 2009',
      'Uher R. et al. — Medial prefrontal cortex activity associated with symptom provocation in eating disorders, American Journal of Psychiatry, 2004',
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
    starvationRu:
      'В норме нехватка пищи и её предвкушение усиливают дофаминовый сигнал, направленный на поиск и добывание еды — у здоровых людей после голодания стриатум сильнее реагирует именно на высококалорийную еду.',
    starvationEn:
      'Normally, food scarcity and the anticipation of food increase dopaminergic signaling aimed at seeking and obtaining food - in healthy people, the striatum responds more strongly to high-calorie food specifically after fasting.',
    edRu:
      'При нервной анорексии исследования находят изменённый отклик прилежащего ядра на образы тела. Например, в одном исследовании реакция вентрального стриатума на изображения истощённого тела была выше, чем на изображения тела нормального веса — у здоровых участниц контрольной группы паттерн был обратным. Есть данные, что само ограничение в питании и чрезмерная физическая нагрузка могут закрепляться этой же системой вознаграждения, что помогает объяснить, почему ограничение может ощущаться не как лишение, а как что-то приносящее облегчение или удовлетворение.',
    edEn:
      "In anorexia nervosa, studies find an altered nucleus accumbens response to body-image cues. In one study, for example, the ventral striatum's response to images of an underweight body was higher than to images of a normal-weight body - in healthy control participants the pattern ran the other way. There is evidence that restriction and excessive exercise can themselves become reinforced by this same reward system, which helps explain why restricting can feel less like deprivation and more like relief or satisfaction.",
    sources: [
      'Berridge K.C., Robinson T.E. — What is the role of dopamine in reward: hedonic impact, reward learning, or incentive salience?, Brain Research Reviews, 1998',
      'Goldstone A.P. et al. — Fasting biases brain reward systems towards high-calorie foods, European Journal of Neuroscience, 2009',
      'A Neural Signature of Anorexia Nervosa in the Ventral Striatal Reward System, American Journal of Psychiatry, 2009',
      'Avena N.M., Bocarsly M.E. — Dysregulation of Brain Reward Systems in Eating Disorders: Neurochemical Information from Animal Models of Binge Eating, Bulimia Nervosa, and Anorexia Nervosa, Neuropharmacology (PMC)',
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
      'У голодных людей передняя поясная кора по-разному реагирует на пищевые и непищевые изображения — это показано у здоровых людей разных возрастов, не только при РПП. Это согласуется с ролью ACC в разрешении конкурирующих сигналов вокруг еды.',
    starvationEn:
      "In hungry people, the ACC responds differently to food versus non-food images - this has been shown across healthy people of different ages, not only in eating disorders, consistent with the ACC's role in resolving competing food-related signals.",
    edRu:
      'При нервной анорексии передняя поясная кора сильнее активируется в ответ на изображения еды, которые пациентки описывают как пугающие и вызывающие отвращение. Это согласуется с идеей, что для мозга при этом расстройстве еда обрабатывается не как нейтральный или желанный стимул, а как угроза, требующая реакции.',
    edEn:
      'In anorexia nervosa, the ACC activates more strongly in response to food images, which patients describe as frightening and disgusting. This fits the idea that, in this disorder, the brain processes food not as a neutral or desirable stimulus but as a threat requiring a response.',
    sources: [
      'Botvinick M.M., Braver T.S., Barch D.M., Carter C.S., Cohen J.D. — Conflict monitoring and cognitive control, Psychological Review, 2001',
      'Charbonnier L. et al. — Effects of hunger state on the brain responses to food cues across the life span, NeuroImage, 2018',
      'Uher R. et al. — Medial prefrontal cortex activity associated with symptom provocation in eating disorders, American Journal of Psychiatry, 2004',
    ],
  },
  {
    id: 'dlpfc',
    titleRu: 'Дорсолатеральная префронтальная кора',
    titleEn: 'Dorsolateral prefrontal cortex (dlPFC)',
    normalRu: 'Отвечает за планирование, следование правилам и сознательный контроль над импульсами. Это часть «исполнительных функций» мозга.',
    normalEn: "Supports planning, rule-following, and conscious control over impulses. This is part of the brain's \"executive function\" system.",
    starvationRu:
      'Острое тяжёлое голодание ухудшает концентрацию и исполнительные функции в целом. Из-за нехватки энергии страдает сама способность мозга ясно мыслить и выполнять сложные задачи, что было хорошо задокументировано ещё в классическом Миннесотском эксперименте по голоданию. Более точечно, после продолжительного голодания отклик именно дорсолатеральной префронтальной коры на еду у здоровых людей снижается — в отличие от островковой доли и орбитофронтальной коры, где он растёт.',
    starvationEn:
      "Acute severe starvation impairs concentration and executive function generally. The brain's own capacity for clear thinking and complex tasks suffers from the energy shortfall, well documented as far back as the classic Minnesota Starvation Experiment. More specifically, after extended fasting the dlPFC's own response to food decreases in healthy people - unlike the insula and orbitofrontal cortex, where it increases.",
    edRu:
      'При этом при нервной анорексии активность и связность дорсолатеральной префронтальной коры с зонами вознаграждения часто оказываются повышенными во время задач, связанных с едой и регуляцией эмоций. Это согласуется с клинически описанным паттерном «гиперконтроля», при котором жёсткое следование правилам питания преобладает над гибким реагированием на ситуацию, и связано с ухудшением эмоционального состояния.',
    edEn:
      "Yet in anorexia nervosa, dlPFC activity and its connectivity with reward regions are often found to be elevated during food-related and emotion-regulation tasks. This is consistent with the clinically described pattern of \"over-control,\" where rigid rule-following about food dominates over flexible, in-the-moment responding, and is linked to worse emotional outcomes.",
    sources: [
      'Miller E.K., Cohen J.D. — An integrative theory of prefrontal cortex function, Annual Review of Neuroscience, 2001',
      'Kalm L.M., Semba R.D. — They Starved So That Others Be Better Fed: Remembering Ancel Keys and the Minnesota Experiment, Journal of Nutrition, 2005',
      'Kerem L. et al. — Modulation of neural fMRI responses to visual food cues by overeating and fasting interventions: A preliminary study, Physiological Reports, 2021',
      'Pauligk S. et al. — Overcontrol in anorexia nervosa: Elevated prefrontal activity and amygdala connectivity in a working memory task with food distractors, International Journal of Clinical and Health Psychology, 2025',
    ],
  },
];
