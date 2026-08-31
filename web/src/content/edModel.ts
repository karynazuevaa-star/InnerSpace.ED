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
  'Концептуализация случая без привязки к конкретному диагнозу вроде нервной анорексии, нервной булимии или приступообразного переедания. В центре модели общие процессы, которые поддерживают самые разные расстройства пищевого поведения. У части клиентов к этому базовому циклу добавляются ещё четыре фактора: перфекционизм, устойчиво низкая самооценка, трудности с переносимостью эмоций и сложности в отношениях. Это учебная схема, не диагностика конкретного человека.';

export const ED_MODEL_INTRO_EN =
  'A case formulation that does not start from a specific diagnosis such as anorexia nervosa, bulimia nervosa, or binge eating disorder. At the center of the model are the shared processes that keep very different eating disorders going. In some clients four extra factors layer on top of this core cycle: perfectionism, persistently low self-esteem, difficulty tolerating emotions, and relationship difficulties. This is an educational diagram, not a diagnosis of any individual.';

export const ED_MODEL_NODES: EDModelNode[] = [
  {
    id: 'overvaluation',
    titleRu: 'Сверхценность формы, веса и контроля над питанием',
    titleEn: 'Over-evaluation of shape, weight, and control over eating',
    itemsRu: ['Мысли', 'Эмоции', 'Убеждения', 'Отношение к телу', 'Отношение к себе', 'Отношение к еде и питанию'],
    itemsEn: ['Thoughts', 'Emotions', 'Beliefs', 'Attitude toward the body', 'Attitude toward the self', 'Attitude toward food and eating'],
    explanationRu:
      'Человек судит о собственной ценности почти исключительно по форме тела, весу и умению их контролировать. У большинства людей самооценка складывается из многих сфер жизни, а здесь она сужается почти до одной. Именно эта установка задаёт направление всему остальному циклу и получает подкрепление от компенсаторного поведения на последнем шаге.',
    explanationEn:
      'A person judges their own worth almost entirely by body shape, weight, and the ability to control them. For most people self-worth comes from many areas of life, but here it narrows down to almost just one. This belief sets the direction for the rest of the cycle and gets reinforced by the compensatory behavior at the final step.',
  },
  {
    id: 'control',
    titleRu: 'Поведение контроля и совладания',
    titleEn: 'Control and coping behavior',
    itemsRu: [
      'Строгие диеты',
      'Тренировки',
      'Пищевые правила',
      'Проверки тела',
      'Телесное избегание',
      'Сравнение себя с другими',
      'Переедания',
      'Мониторинг питания и другое',
    ],
    itemsEn: [
      'Strict diets',
      'Exercise',
      'Food rules',
      'Body checking',
      'Body avoidance',
      'Comparing yourself with others',
      'Overeating',
      'Monitoring food intake, and more',
    ],
    explanationRu:
      'Чтобы почувствовать контроль, человек вводит жёсткие и часто нереалистичные правила питания и поведения, например «никаких углеводов после шести» или «не больше 800 калорий в день». Такие правила легко нарушить в обычной жизни, а само нарушение воспринимается не как мелочь, а как полный провал. Именно это открывает дорогу к перееданию на следующем шаге.',
    explanationEn:
      'To feel in control, a person sets strict, often unrealistic rules around eating and behavior, for example "no carbs after 6pm" or "under 800 calories a day." These rules are easy to break in ordinary life, and breaking even one of them tends to feel like total failure rather than a minor slip. That is what opens the door to a binge at the next step.',
  },
  {
    id: 'binge',
    titleRu: 'Переедания',
    titleEn: 'Binge eating',
    itemsRu: ['Субъективные', 'Объективные'],
    itemsEn: ['Subjective', 'Objective'],
    explanationRu:
      'Переедание бывает объективным, когда еды действительно много по любым меркам, и субъективным, когда еды немного, но всё равно возникает чувство потери контроля. Для цикла важен именно этот субъективный опыт потери контроля, а не точное количество съеденного или калорий.',
    explanationEn:
      'A binge can be objective, when the amount of food really is large by any standard, or subjective, when the amount is modest but a sense of losing control still shows up. What drives the cycle is that felt loss of control, not the exact amount of food or the calorie count.',
  },
  {
    id: 'compensation',
    titleRu: 'Компенсации',
    titleEn: 'Compensations',
    itemsRu: ['Вызывание рвоты', 'Слабительные', 'Мочегонные', 'Чрезмерные тренировки', 'Усиление пищевых правил'],
    itemsEn: ['Self-induced vomiting', 'Laxatives', 'Diuretics', 'Excessive exercise', 'Even stricter food rules'],
    explanationRu:
      'После переедания тревога о весе и форме тела резко растёт, и человек пытается снять её компенсаторными способами. Тревога на время отступает, поэтому такое поведение закрепляется, но сама сверхценность формы и веса от этого только усиливается. Цикл замыкается и начинается заново с первого шага.',
    explanationEn:
      'After a binge, anxiety about weight and shape spikes, and a person tries to undo it through compensatory behavior. The anxiety eases for a while, which reinforces the behavior, but the underlying over-evaluation of shape and weight only gets stronger. The cycle closes and starts again from the first step.',
  },
];

export const ED_MODEL_SOURCES: string[] = [
  'Fairburn C.G., Cooper Z., Shafran R. — Cognitive behaviour therapy for eating disorders: a "transdiagnostic" theory and treatment, Behaviour Research and Therapy, 2003',
  'Fairburn C.G. — Cognitive Behavior Therapy and Eating Disorders, Guilford Press, 2008',
  'CBT-E — The transdiagnostic view of eating disorders, cbte.co',
];
