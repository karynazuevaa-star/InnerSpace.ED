// Transdiagnostic cognitive-behavioral model of eating disorders (Fairburn,
// Cooper & Shafran, 2003) for the Psychoeducation tab. The four-box cycle
// below matches the classic CBT-E maintenance diagram; explanations are
// grounded in that paper and later CBT-E clinical material, not written
// from unverified memory alone (see ED_MODEL_SOURCES).
export interface EDModelNode {
  id: string;
  titleRu: string;
  titleEn: string;
  itemsRu: string[];
  itemsEn: string[];
  explanationRu: string;
  explanationEn: string;
}

export const ED_MODEL_INTRO_RU =
  'Модель описывает не диагноз, а механизм: общие процессы, которые поддерживают расстройства пищевого поведения - независимо от того, о нервной анорексии идёт речь, булимии или приступообразном переедании. У части клиентов к этому базовому циклу добавляются ещё четыре фактора: перфекционизм, устойчиво низкая самооценка, трудности с переносимостью эмоций и сложности в отношениях. Перед вами учебная схема, а не диагностика конкретного человека.';

export const ED_MODEL_INTRO_EN =
  'This model maps a mechanism, not a diagnosis - the shared processes that keep eating disorders going, whether the diagnosis is anorexia nervosa, bulimia nervosa, or binge eating disorder. For some clients, four extra factors layer on top of this core cycle: perfectionism, persistently low self-esteem, difficulty tolerating emotions, and relationship difficulties. Treat this as a teaching diagram, not an assessment of any one person.';

export const ED_MODEL_NODES: EDModelNode[] = [
  {
    id: 'overvaluation',
    titleRu: 'Сверхценность формы, веса и контроля над питанием',
    titleEn: 'Over-evaluation of shape, weight, and control over eating',
    itemsRu: ['Убеждения', 'Мысли', 'Эмоции', 'Отношение к еде и питанию', 'Отношение к телу', 'Отношение к себе'],
    itemsEn: ['Beliefs', 'Thoughts', 'Emotions', 'Attitude toward food and eating', 'Attitude toward the body', 'Attitude toward the self'],
    explanationRu:
      'Здесь ценность себя как личности почти полностью сводится к тому, как выглядит тело, сколько оно весит и получается ли это контролировать. У большинства людей самооценка опирается на разные сферы - работу, отношения, увлечения, - а тут остаётся, по сути, одна. Эта установка задаёт направление всему циклу: именно она подпитывается компенсаторным поведением на последнем шаге.',
    explanationEn:
      "Here, a person's sense of worth collapses down to body shape, weight, and whether those feel controlled. Most people's self-esteem draws on several areas of life - work, relationships, hobbies - but this narrows to essentially one. That belief drives the whole cycle, and gets topped up again by the compensatory behavior at the final step.",
  },
  {
    id: 'control',
    titleRu: 'Поведение контроля и совладания',
    titleEn: 'Control and coping behavior',
    itemsRu: [
      'Пищевые правила',
      'Строгие диеты',
      'Мониторинг питания и другое',
      'Проверки тела',
      'Сравнение себя с другими',
      'Телесное избегание',
      'Тренировки',
      'Переедания',
    ],
    itemsEn: [
      'Food rules',
      'Strict diets',
      'Monitoring food intake, and more',
      'Body checking',
      'Comparing yourself with others',
      'Body avoidance',
      'Exercise',
      'Overeating',
    ],
    explanationRu:
      'Чтобы удержать ощущение контроля, человек устанавливает себе строгие, часто невыполнимые правила - вроде «никаких углеводов после шести» или «не больше 800 калорий в день». В реальной жизни такие правила почти неизбежно нарушаются, и любое отступление воспринимается не как мелочь, а как полный срыв. Именно это ощущение провала открывает путь к перееданию на следующем шаге.',
    explanationEn:
      'To hold on to a sense of control, a person builds strict, often unworkable rules - "no carbs after six," "under 800 calories a day." Real life makes these almost impossible to keep, and the first slip reads not as minor but as total failure. That sense of failure is what pushes things toward a binge at the next step.',
  },
  {
    id: 'binge',
    titleRu: 'Переедания',
    titleEn: 'Binge eating',
    itemsRu: ['Объективные', 'Субъективные'],
    itemsEn: ['Objective', 'Subjective'],
    explanationRu:
      'Переедание считается объективным, если еды по любым меркам действительно много, и субъективным - если её немного, но ощущение утраты контроля всё равно есть. Для самого цикла важнее именно это ощущение, а не то, сколько калорий было съедено на самом деле.',
    explanationEn:
      'A binge counts as objective when the amount of food really is large by any measure, and subjective when the amount is modest but the feeling of losing control shows up anyway. What keeps the cycle turning is that feeling, not the actual calorie count.',
  },
  {
    id: 'compensation',
    titleRu: 'Компенсации',
    titleEn: 'Compensations',
    itemsRu: ['Усиление пищевых правил', 'Чрезмерные тренировки', 'Вызывание рвоты', 'Слабительные', 'Мочегонные'],
    itemsEn: ['Even stricter food rules', 'Excessive exercise', 'Self-induced vomiting', 'Laxatives', 'Diuretics'],
    explanationRu:
      'После переедания резко подскакивает тревога за вес и форму тела, и человек пытается её снять - рвотой, слабительными, изнурительными тренировками или ужесточением правил. Тревога ненадолго отпускает, и поведение закрепляется, но сама сверхценность веса и формы от этого только крепнет. Круг замыкается, и цикл начинается заново.',
    explanationEn:
      'After a binge, anxiety about weight and shape spikes, and a person reaches for something to bring it down - vomiting, laxatives, punishing exercise, tighter rules. The anxiety fades for a while, which locks the behavior in, but the underlying over-evaluation of weight and shape only grows stronger. The loop closes, and the cycle starts over.',
  },
];

export const ED_MODEL_SOURCES: string[] = [
  'Fairburn C.G., Cooper Z., Shafran R. — Cognitive behaviour therapy for eating disorders: a "transdiagnostic" theory and treatment, Behaviour Research and Therapy, 2003',
  'Fairburn C.G. — Cognitive Behavior Therapy and Eating Disorders, Guilford Press, 2008',
  'CBT-E — The transdiagnostic view of eating disorders, cbte.co',
];
