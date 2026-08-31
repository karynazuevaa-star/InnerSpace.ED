// Real, scorable psychometric instruments for the Tests page. Unlike
// content/techniques.ts's Instrument type (a static description of what a
// tool measures), a RealTest carries its actual items, answer scales, and
// a computeResult function - the client can fill it in and see a real
// score, not just read about the instrument.
export interface ScaleOption {
  value: number;
  ru: string;
  en: string;
}

export interface TestQuestion {
  id: string;
  ru: string;
  en: string;
  kind: 'scale' | 'number';
  options?: ScaleOption[]; // overrides the section's default options
  unitRu?: string; // for kind: 'number'
  unitEn?: string;
}

export interface TestSection {
  noteRu?: string;
  noteEn?: string;
  options?: ScaleOption[]; // default scale for 'scale' questions in this section
  questions: TestQuestion[];
}

export interface SubscaleResult {
  labelRu: string;
  labelEn: string;
  score: number;
  range: string; // possible score range, e.g. "0–6"
  typicalRu?: string; // typical/normative range, when known
  typicalEn?: string;
}

export interface TestResult {
  subscales: SubscaleResult[];
  overallRu: string;
  overallEn: string;
}

export interface RealTest {
  id: string;
  titleRu: string;
  titleEn: string;
  summaryRu: string;
  summaryEn: string;
  // Short clinical description shown on the intro page, before the client
  // starts answering questions. instructionsRu/En is the test's own formal
  // wording ("read each statement and...") and gets its own page after
  // that, right before the first question.
  descriptionRu: string;
  descriptionEn: string;
  instructionsRu: string;
  instructionsEn: string;
  sections: TestSection[];
  computeResult: (answers: Record<string, number>) => TestResult;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// STAI Short Form (State-Trait Anxiety Inventory, Marteau & Bekker 1992)
// ---------------------------------------------------------------------------
const staiOptions: ScaleOption[] = [
  { value: 1, ru: 'Совсем нет', en: 'Not at all' },
  { value: 2, ru: 'Немного', en: 'Somewhat' },
  { value: 3, ru: 'Умеренно', en: 'Moderately' },
  { value: 4, ru: 'Очень сильно', en: 'Very much' },
];

const STAI_POSITIVE_IDS = ['stai1', 'stai4', 'stai5'];
const STAI_ALL_IDS = ['stai1', 'stai2', 'stai3', 'stai4', 'stai5', 'stai6'];

const staiTest: RealTest = {
  id: 'stai6',
  titleRu: 'STAI, краткая форма (State-Trait Anxiety Inventory)',
  titleEn: 'STAI Short Form (State-Trait Anxiety Inventory)',
  summaryRu: 'Быстрая оценка ситуативной тревоги «здесь и сейчас», 6 пунктов.',
  summaryEn: 'A quick 6-item read on state anxiety, right here and now.',
  descriptionRu:
    'Краткая, из 6 пунктов, версия шкалы ситуативной тревоги (State) из полного опросника STAI. Позволяет быстро понять, насколько тревожно клиент чувствует себя прямо сейчас, не отнимая много времени сессии. Удобно использовать до и после работы с аватаром, чтобы отделить колебания тревоги от изменений в восприятии тела.',
  descriptionEn:
    'A short, 6-item version of the State anxiety scale from the full STAI questionnaire. It gives a quick read on how anxious the client feels right now, without taking up much session time. Handy to use before and after working with the avatar, to separate fluctuations in anxiety from changes in body perception.',
  instructionsRu:
    'Ниже приведён ряд утверждений, которые люди используют, чтобы описать себя. Прочитайте каждое утверждение и выберите вариант, который лучше всего описывает, как вы чувствуете себя прямо сейчас, в этот момент. Правильных или неправильных ответов нет. Не задерживайтесь долго на одном утверждении, просто выберите тот ответ, который точнее всего описывает ваше текущее состояние.',
  instructionsEn:
    'A number of statements which people use to describe themselves are given below. Read each statement and then select the answer that best indicates how you feel right now, at this moment. There are no right or wrong answers. Do not spend too much time on any one statement, just give the answer that seems to describe your present feelings best.',
  sections: [
    {
      options: staiOptions,
      questions: [
        { id: 'stai1', ru: 'Я спокоен(-йна)', en: 'I feel calm', kind: 'scale' },
        { id: 'stai2', ru: 'Я напряжён(-а)', en: 'I am tense', kind: 'scale' },
        { id: 'stai3', ru: 'Я расстроен(-а)', en: 'I feel upset', kind: 'scale' },
        { id: 'stai4', ru: 'Я раскован(-а)', en: 'I am relaxed', kind: 'scale' },
        { id: 'stai5', ru: 'Я доволен(-льна)', en: 'I feel content', kind: 'scale' },
        { id: 'stai6', ru: 'Я обеспокоен(-а)', en: 'I am worried', kind: 'scale' },
      ],
    },
  ],
  computeResult: (answers) => {
    let sum = 0;
    for (const id of STAI_ALL_IDS) {
      const raw = answers[id] ?? 1;
      sum += STAI_POSITIVE_IDS.includes(id) ? 5 - raw : raw;
    }
    const total = round1((sum * 20) / 6);
    const bandRu = total < 37 ? 'низкая тревога' : total < 55 ? 'умеренная тревога' : 'выраженная тревога';
    const bandEn = total < 37 ? 'low anxiety' : total < 55 ? 'moderate anxiety' : 'high anxiety';
    return {
      subscales: [
        {
          labelRu: 'Ситуативная тревога (State)',
          labelEn: 'State anxiety',
          score: total,
          range: '20–80',
        },
      ],
      overallRu: `Итоговый балл ${total} из 80. Ориентировочно это ${bandRu}. Пороговые значения здесь условны, используйте результат как материал для обсуждения с клиентом и для сравнения «до и после», а не как диагностический показатель.`,
      overallEn: `The total score is ${total} out of 80. That roughly corresponds to ${bandEn}. The cutoffs here are approximate, so use the result as material for discussion with the client and for before-and-after comparison, not as a diagnostic measure.`,
    };
  },
};

// ---------------------------------------------------------------------------
// EDE-Q 6.0 (Eating Disorder Examination Questionnaire, Fairburn & Beglin 2008)
// ---------------------------------------------------------------------------
const edeqFreqOptions: ScaleOption[] = [
  { value: 0, ru: 'Ни одного дня', en: 'No days' },
  { value: 1, ru: '1–5 дней', en: '1–5 days' },
  { value: 2, ru: '6–12 дней', en: '6–12 days' },
  { value: 3, ru: '13–15 дней', en: '13–15 days' },
  { value: 4, ru: '16–22 дня', en: '16–22 days' },
  { value: 5, ru: '23–27 дней', en: '23–27 days' },
  { value: 6, ru: 'Каждый день', en: 'Every day' },
];

const edeqProportionOptions: ScaleOption[] = [
  { value: 0, ru: 'Ни разу', en: 'None of the times' },
  { value: 1, ru: 'В нескольких случаях', en: 'A few of the times' },
  { value: 2, ru: 'Менее чем в половине случаев', en: 'Less than half the times' },
  { value: 3, ru: 'В половине случаев', en: 'Half of the times' },
  { value: 4, ru: 'Более чем в половине случаев', en: 'More than half the times' },
  { value: 5, ru: 'В большинстве случаев', en: 'Most of the time' },
  { value: 6, ru: 'Каждый раз', en: 'Every time' },
];

const edeqMarkedlyOptions: ScaleOption[] = [
  { value: 0, ru: 'Совсем нет', en: 'Not at all' },
  { value: 1, ru: '', en: '' },
  { value: 2, ru: 'Немного', en: 'Slightly' },
  { value: 3, ru: '', en: '' },
  { value: 4, ru: 'Умеренно', en: 'Moderately' },
  { value: 5, ru: '', en: '' },
  { value: 6, ru: 'Значительно', en: 'Markedly' },
];

const edeqTest: RealTest = {
  id: 'edeq6',
  titleRu: 'EDE-Q 6.0 (Eating Disorder Examination Questionnaire)',
  titleEn: 'EDE-Q 6.0 (Eating Disorder Examination Questionnaire)',
  summaryRu: 'Симптомы расстройств пищевого поведения за последние 28 дней, 28 пунктов.',
  summaryEn: 'Eating-disorder symptoms over the past 28 days, 28 items.',
  descriptionRu:
    'Опросник самоотчёта, построенный на основе клинического интервью Eating Disorder Examination. Оценивает частоту и выраженность симптомов РПП за последние 28 дней по четырём субшкалам, а также отдельно фиксирует эпизоды переедания и компенсаторное поведение. Не диагностический инструмент сам по себе, диагноз ставит специалист по совокупности клинической картины.',
  descriptionEn:
    'A self-report questionnaire built from the clinical Eating Disorder Examination interview. It assesses the frequency and severity of ED symptoms over the past 28 days across four subscales, and separately records binge eating episodes and compensatory behaviors. Not a diagnostic instrument on its own, a clinician makes the diagnosis based on the full clinical picture.',
  instructionsRu:
    'Следующие вопросы касаются только последних четырёх недель (28 дней). Прочитайте, пожалуйста, каждый вопрос внимательно и ответьте на все вопросы.',
  instructionsEn:
    'The following questions are concerned with the past four weeks (28 days) only. Please read each question carefully and answer all the questions.',
  sections: [
    {
      noteRu: 'В течение скольких из последних 28 дней…',
      noteEn: 'On how many of the past 28 days …',
      options: edeqFreqOptions,
      questions: [
        {
          id: 'q1',
          kind: 'scale',
          ru: 'Пытались ли вы сознательно ограничивать количество съедаемой пищи, чтобы повлиять на форму тела или вес (независимо от того, удавалось ли вам это)?',
          en: 'Have you been deliberately trying to limit the amount of food you eat to influence your shape or weight (whether or not you have succeeded)?',
        },
        {
          id: 'q2',
          kind: 'scale',
          ru: 'Бывали ли у вас длительные периоды (8 часов бодрствования и более), когда вы вообще ничего не ели, чтобы повлиять на форму тела или вес?',
          en: 'Have you gone for long periods of time (8 waking hours or more) without eating anything at all in order to influence your shape or weight?',
        },
        {
          id: 'q3',
          kind: 'scale',
          ru: 'Пытались ли вы полностью исключить из своего рациона какие-либо любимые продукты, чтобы повлиять на форму тела или вес (независимо от того, удавалось ли вам это)?',
          en: 'Have you tried to exclude from your diet any foods that you like in order to influence your shape or weight (whether or not you have succeeded)?',
        },
        {
          id: 'q4',
          kind: 'scale',
          ru: 'Пытались ли вы следовать чётким правилам питания (например, ограничению калорий), чтобы повлиять на форму тела или вес (независимо от того, удавалось ли вам это)?',
          en: 'Have you tried to follow definite rules regarding your eating (for example, a calorie limit) in order to influence your shape or weight (whether or not you have succeeded)?',
        },
        {
          id: 'q5',
          kind: 'scale',
          ru: 'Возникало ли у вас отчётливое желание, чтобы желудок был пустым, с целью повлиять на форму тела или вес?',
          en: 'Have you had a definite desire to have an empty stomach with the aim of influencing your shape or weight?',
        },
        {
          id: 'q6',
          kind: 'scale',
          ru: 'Возникало ли у вас отчётливое желание иметь совершенно плоский живот?',
          en: 'Have you had a definite desire to have a totally flat stomach?',
        },
        {
          id: 'q7',
          kind: 'scale',
          ru: 'Мешали ли вам мысли о еде, приёме пищи или калориях сосредоточиться на интересующих вас делах (например, работе, разговоре или чтении)?',
          en: 'Has thinking about food, eating or calories made it very difficult to concentrate on things you are interested in (for example, working, following a conversation, or reading)?',
        },
        {
          id: 'q8',
          kind: 'scale',
          ru: 'Мешали ли вам мысли о форме тела или весе сосредоточиться на интересующих вас делах (например, работе, разговоре или чтении)?',
          en: 'Has thinking about shape or weight made it very difficult to concentrate on things you are interested in (for example, working, following a conversation, or reading)?',
        },
        {
          id: 'q9',
          kind: 'scale',
          ru: 'Возникал ли у вас отчётливый страх потерять контроль над приёмом пищи?',
          en: 'Have you had a definite fear of losing control over eating?',
        },
        {
          id: 'q10',
          kind: 'scale',
          ru: 'Возникал ли у вас отчётливый страх набрать вес?',
          en: 'Have you had a definite fear that you might gain weight?',
        },
        {
          id: 'q11',
          kind: 'scale',
          ru: 'Чувствовали ли вы себя толстым(-ой)?',
          en: 'Have you felt fat?',
        },
        {
          id: 'q12',
          kind: 'scale',
          ru: 'Возникало ли у вас сильное желание похудеть?',
          en: 'Have you had a strong desire to lose weight?',
        },
      ],
    },
    {
      noteRu: 'За последние 28 дней, впишите число.',
      noteEn: 'Over the past 28 days, enter a number.',
      questions: [
        {
          id: 'q13',
          kind: 'number',
          ru: 'Сколько раз вы съедали количество пищи, которое окружающие сочли бы необычно большим (с учётом обстоятельств)?',
          en: 'How many times have you eaten what other people would regard as an unusually large amount of food (given the circumstances)?',
          unitRu: 'раз',
          unitEn: 'times',
        },
        {
          id: 'q14',
          kind: 'number',
          ru: '…В скольких из этих случаев вы ощущали потерю контроля над приёмом пищи (непосредственно во время еды)?',
          en: '… On how many of these times did you have a sense of having lost control over your eating (at the time you were eating)?',
          unitRu: 'раз',
          unitEn: 'times',
        },
        {
          id: 'q15',
          kind: 'number',
          ru: 'В течение скольких ДНЕЙ у вас случались такие эпизоды переедания (то есть вы съедали необычно большое количество пищи и при этом ощущали потерю контроля)?',
          en: 'On how many DAYS have such episodes of overeating occurred (i.e. you have eaten an unusually large amount of food and have had a sense of loss of control at the time)?',
          unitRu: 'дней',
          unitEn: 'days',
        },
        {
          id: 'q16',
          kind: 'number',
          ru: 'Сколько раз вы вызывали у себя рвоту как способ контроля формы тела или веса?',
          en: 'How many times have you made yourself sick (vomit) as a means of controlling your shape or weight?',
          unitRu: 'раз',
          unitEn: 'times',
        },
        {
          id: 'q17',
          kind: 'number',
          ru: 'Сколько раз вы принимали слабительные как способ контроля формы тела или веса?',
          en: 'How many times have you taken laxatives as a means of controlling your shape or weight?',
          unitRu: 'раз',
          unitEn: 'times',
        },
        {
          id: 'q18',
          kind: 'number',
          ru: 'Сколько раз вы занимались физическими упражнениями в «навязчивой» или «принудительной» манере, чтобы контролировать вес, форму тела, количество жира или сжечь калории?',
          en: 'How many times have you exercised in a "driven" or "compulsive" way as a means of controlling your weight, shape or amount of fat, or to burn off calories?',
          unitRu: 'раз',
          unitEn: 'times',
        },
      ],
    },
    {
      options: edeqFreqOptions,
      questions: [
        {
          id: 'q19',
          kind: 'scale',
          ru: 'За последние 28 дней в течение скольких дней вы ели тайком (украдкой)? Не учитывайте эпизоды переедания.',
          en: 'Over the past 28 days, on how many days have you eaten in secret (i.e. furtively)? Do not count episodes of binge eating.',
        },
      ],
    },
    {
      options: edeqProportionOptions,
      questions: [
        {
          id: 'q20',
          kind: 'scale',
          ru: 'В какой доле случаев приёма пищи вы чувствовали вину (ощущение, что поступаете неправильно) из-за влияния на форму тела или вес? Не учитывайте эпизоды переедания.',
          en: "On what proportion of the times that you have eaten have you felt guilty (felt that you've done wrong) because of its effect on your shape or weight? Do not count episodes of binge eating.",
        },
      ],
    },
    {
      options: edeqMarkedlyOptions,
      questions: [
        {
          id: 'q21',
          kind: 'scale',
          ru: 'За последние 28 дней насколько вас беспокоило, что окружающие видят, как вы едите? Не учитывайте эпизоды переедания.',
          en: 'Over the past 28 days, how concerned have you been about other people seeing you eat? Do not count episodes of binge eating.',
        },
        {
          id: 'q22',
          kind: 'scale',
          ru: 'Влиял ли ваш вес на то, как вы оцениваете себя как личность?',
          en: 'Has your weight influenced how you think about (judge) yourself as a person?',
        },
        {
          id: 'q23',
          kind: 'scale',
          ru: 'Влияла ли форма вашего тела на то, как вы оцениваете себя как личность?',
          en: 'Has your shape influenced how you think about (judge) yourself as a person?',
        },
        {
          id: 'q24',
          kind: 'scale',
          ru: 'Насколько бы вас расстроила просьба взвешиваться ровно раз в неделю (не чаще и не реже) в течение следующих четырёх недель?',
          en: 'How much would it have upset you if you had been asked to weigh yourself once a week (no more, or less, often) for the next four weeks?',
        },
        {
          id: 'q25',
          kind: 'scale',
          ru: 'Насколько вы были неудовлетворены своим весом?',
          en: 'How dissatisfied have you been with your weight?',
        },
        {
          id: 'q26',
          kind: 'scale',
          ru: 'Насколько вы были неудовлетворены формой своего тела?',
          en: 'How dissatisfied have you been with your shape?',
        },
        {
          id: 'q27',
          kind: 'scale',
          ru: 'Насколько некомфортно вам было видеть своё тело (например, в зеркале, в отражении витрины, раздеваясь или принимая ванну/душ)?',
          en: 'How uncomfortable have you felt seeing your body (for example, seeing your shape in the mirror, in a shop window reflection, while undressing or taking a bath or shower)?',
        },
        {
          id: 'q28',
          kind: 'scale',
          ru: 'Насколько некомфортно вам было от того, что другие видят форму вашего тела (например, в общей раздевалке, во время плавания или в обтягивающей одежде)?',
          en: 'How uncomfortable have you felt about others seeing your shape or figure (for example, in communal changing rooms, when swimming, or wearing tight clothes)?',
        },
      ],
    },
  ],
  computeResult: (answers) => {
    const g = (id: string) => answers[id] ?? 0;
    const mean = (ids: string[]) => ids.reduce((s, id) => s + g(id), 0) / ids.length;
    const restraint = mean(['q1', 'q2', 'q3', 'q4', 'q5']);
    const eating = mean(['q7', 'q9', 'q19', 'q20', 'q21']);
    const weight = mean(['q8', 'q12', 'q22', 'q24', 'q25']);
    const shape = mean(['q6', 'q8', 'q10', 'q11', 'q23', 'q26', 'q27', 'q28']);
    const global = (restraint + eating + weight + shape) / 4;
    const binges = g('q13');
    const bingesLossControl = g('q14');
    const bingeDays = g('q15');
    const vomit = g('q16');
    const laxatives = g('q17');
    const compulsiveExercise = g('q18');
    return {
      subscales: [
        { labelRu: 'Пищевые ограничения (Restraint)', labelEn: 'Restraint', score: round2(restraint), range: '0–6' },
        { labelRu: 'Озабоченность едой (Eating concern)', labelEn: 'Eating concern', score: round2(eating), range: '0–6' },
        { labelRu: 'Озабоченность весом (Weight concern)', labelEn: 'Weight concern', score: round2(weight), range: '0–6' },
        { labelRu: 'Озабоченность формой тела (Shape concern)', labelEn: 'Shape concern', score: round2(shape), range: '0–6' },
        { labelRu: 'Общий балл (Global score)', labelEn: 'Global score', score: round2(global), range: '0–6' },
      ],
      overallRu: `За последние 28 дней у клиента было ${binges} эпизодов переедания, из них ${bingesLossControl} с потерей контроля, в течение ${bingeDays} дн. Самовызванная рвота случилась ${vomit} раз, приём слабительных ${laxatives} раз, компульсивные физические нагрузки ${compulsiveExercise} раз. Чем выше субшкальные баллы, тем более выражена симптоматика. EDE-Q является скрининговым самоотчётом, а не диагностическим инструментом. Итоговое заключение делает специалист, опираясь на полную клиническую картину.`,
      overallEn: `Over the past 28 days, the client reported ${binges} binge-eating episodes, ${bingesLossControl} of them with loss of control, across ${bingeDays} days. Self-induced vomiting happened ${vomit} times, laxative use ${laxatives} times, and compulsive exercise ${compulsiveExercise} times. Higher subscale scores reflect more severe symptoms. The EDE-Q is a self-report screening tool, not a diagnostic instrument. A clinician makes the final assessment based on the full clinical picture.`,
    };
  },
};

// ---------------------------------------------------------------------------
// MBSRQ — Multidimensional Body-Self Relations Questionnaire (34-item form)
// ---------------------------------------------------------------------------
const mbsrqAgreeOptions: ScaleOption[] = [
  { value: 1, ru: 'Совершенно не согласен(-а)', en: 'Strongly disagree' },
  { value: 2, ru: 'В основном не согласен(-а)', en: 'Mostly disagree' },
  { value: 3, ru: 'Затрудняюсь ответить', en: 'Neither agree nor disagree' },
  { value: 4, ru: 'В основном согласен(-а)', en: 'Mostly agree' },
  { value: 5, ru: 'Полностью согласен(-а)', en: 'Strongly agree' },
];

const mbsrqFreqOptions: ScaleOption[] = [
  { value: 1, ru: 'Никогда', en: 'Never' },
  { value: 2, ru: 'Редко', en: 'Rarely' },
  { value: 3, ru: 'Иногда', en: 'Sometimes' },
  { value: 4, ru: 'Часто', en: 'Often' },
  { value: 5, ru: 'Очень часто', en: 'Very often' },
];

const mbsrqSizeOptions: ScaleOption[] = [
  { value: 1, ru: 'Большой недобор в весе', en: 'Very underweight' },
  { value: 2, ru: 'Недостаточный вес', en: 'Somewhat underweight' },
  { value: 3, ru: 'Нормальный вес', en: 'Normal weight' },
  { value: 4, ru: 'Есть лишний вес', en: 'Somewhat overweight' },
  { value: 5, ru: 'Много лишнего веса', en: 'Very overweight' },
];

const mbsrqSatisfactionOptions: ScaleOption[] = [
  { value: 1, ru: 'Крайне недоволен(-а)', en: 'Very dissatisfied' },
  { value: 2, ru: 'В большей степени недоволен(-а)', en: 'Mostly dissatisfied' },
  { value: 3, ru: 'Затрудняюсь ответить', en: 'Neither satisfied nor dissatisfied' },
  { value: 4, ru: 'В основном доволен(-а)', en: 'Mostly satisfied' },
  { value: 5, ru: 'Очень доволен(-а)', en: 'Very satisfied' },
];

const mbsrqTest: RealTest = {
  id: 'mbsrq',
  titleRu: 'MBSRQ (The Multidimensional Body-Self Relations Questionnaire)',
  titleEn: 'MBSRQ (The Multidimensional Body-Self Relations Questionnaire)',
  summaryRu: 'Отношение к собственному телу и внешности, 34 пункта, 5 субшкал.',
  summaryEn: "Attitude toward one's own body and appearance, 34 items, 5 subscales.",
  descriptionRu:
    'Опросник отношения к собственному телу и внешности. Измеряет оценку внешности, ориентацию на внешность, удовлетворённость отдельными зонами тела, озабоченность лишним весом и то, как человек сам оценивает свой вес, всего пять аспектов. Помогает увидеть не только общий уровень неудовлетворённости телом, но и то, из чего он складывается.',
  descriptionEn:
    "A questionnaire about attitudes toward one's own body and appearance. It measures appearance evaluation, appearance orientation, satisfaction with individual body areas, overweight preoccupation, and self-classified weight, five aspects in all. It helps show not just an overall level of body dissatisfaction but what it's actually made up of.",
  instructionsRu:
    'Вам будет предложено некоторое количество утверждений о том, что люди могут думать, чувствовать и как могут вести себя. Оцените каждое утверждение по степени того, насколько оно относится конкретно к вам. Старайтесь избегать варианта «затрудняюсь ответить». Правильных и неправильных ответов нет, выбирайте тот вариант, который наиболее вам подходит.',
  instructionsEn:
    'You will be presented with a number of statements about what people might think, feel, and how they might behave. Rate each statement by how much it applies specifically to you. Try to avoid the "neither agree nor disagree" option. There are no right or wrong answers, so choose whichever option fits you best.',
  sections: [
    {
      options: mbsrqAgreeOptions,
      questions: [
        { id: 'q1', kind: 'scale', ru: 'Перед тем как появиться в обществе, я всегда смотрю, как я выгляжу.', en: 'Before going out in public, I always check how I look.' },
        { id: 'q2', kind: 'scale', ru: 'Я стараюсь покупать одежду, в которой я буду выглядеть наилучшим образом.', en: 'I try to buy clothes that will make me look my best.' },
        { id: 'q3', kind: 'scale', ru: 'Моё тело сексуально привлекательно.', en: 'My body is sexually attractive.' },
        { id: 'q4', kind: 'scale', ru: 'Я постоянно беспокоюсь, что у меня избыточный вес или что я могу его набрать.', en: 'I am constantly worried about being or becoming overweight.' },
        { id: 'q5', kind: 'scale', ru: 'Мне нравится, как я выгляжу.', en: 'I like the way I look.' },
        { id: 'q6', kind: 'scale', ru: 'При любой возможности я смотрюсь в зеркало, чтобы проверить, как я выгляжу.', en: 'I check my appearance in a mirror whenever I can.' },
        { id: 'q7', kind: 'scale', ru: 'Перед тем как выйти на улицу, обычно я трачу много времени на сборы.', en: 'Before going out, I usually spend a lot of time getting ready.' },
        { id: 'q8', kind: 'scale', ru: 'Я очень остро чувствую даже незначительные изменения в своём весе.', en: 'I am acutely aware of even small changes in my weight.' },
        { id: 'q9', kind: 'scale', ru: 'Большинство людей считает, что я привлекателен(-льна).', en: 'Most people would consider me attractive.' },
        { id: 'q10', kind: 'scale', ru: 'Для меня важно всегда хорошо выглядеть.', en: 'It is important to me to always look good.' },
        { id: 'q11', kind: 'scale', ru: 'Я пользуюсь немногими средствами по уходу за собой.', en: 'I use very few grooming products.' },
        { id: 'q12', kind: 'scale', ru: 'Мне нравится, как я выгляжу без одежды.', en: 'I like the way I look without clothes on.' },
        { id: 'q13', kind: 'scale', ru: 'Я чувствую себя незащищённым(-ой), если не могу ухаживать за своей внешностью, как нужно.', en: "I feel vulnerable when I can't take care of my appearance the way I'd like to." },
        { id: 'q14', kind: 'scale', ru: 'Обычно я надеваю то, что лежит под рукой, и мне неважно, как это выглядит.', en: 'I usually wear whatever is on hand, without caring how it looks.' },
        { id: 'q15', kind: 'scale', ru: 'Мне нравится, как на мне сидит одежда.', en: 'I like the way my clothes fit me.' },
        { id: 'q16', kind: 'scale', ru: 'Мне всё равно, что окружающие думают о моей внешности.', en: "I don't care what other people think about my appearance." },
        { id: 'q17', kind: 'scale', ru: 'Я стараюсь особенно ухаживать за волосами.', en: 'I make a point of taking special care of my hair.' },
        { id: 'q18', kind: 'scale', ru: 'Мне не нравится мой внешний облик.', en: "I don't like the way I look." },
        { id: 'q19', kind: 'scale', ru: 'Я физически непривлекателен(-льна).', en: 'I am physically unattractive.' },
        { id: 'q20', kind: 'scale', ru: 'Я никогда не задумываюсь о своей внешности.', en: 'I never think about my appearance.' },
        { id: 'q21', kind: 'scale', ru: 'Я всегда стараюсь улучшить свой внешний вид.', en: 'I am always trying to improve my physical appearance.' },
        { id: 'q22', kind: 'scale', ru: 'Я придерживаюсь диеты с целью похудания.', en: 'I diet in order to lose weight.' },
      ],
    },
    {
      options: mbsrqFreqOptions,
      questions: [
        { id: 'q23', kind: 'scale', ru: 'Я пытался(-ась) сбросить вес, ограничивая себя в пище или придерживаясь радикальных диет.', en: 'I have tried to lose weight by fasting or crash dieting.' },
      ],
    },
    {
      options: mbsrqSizeOptions,
      questions: [
        { id: 'q24', kind: 'scale', ru: 'Мне кажется, что у меня:', en: 'I think of myself as:' },
        { id: 'q25', kind: 'scale', ru: 'Взглянув на меня, большинство бы подумало, что у меня:', en: 'Looking at me, most people would think I am:' },
      ],
    },
    {
      noteRu: 'Укажите степень вашей удовлетворённости следующими аспектами вашего тела.',
      noteEn: 'Indicate how satisfied you are with the following aspects of your body.',
      options: mbsrqSatisfactionOptions,
      questions: [
        { id: 'q26', kind: 'scale', ru: 'Лицо (черты лица, цвет лица и состояние кожи).', en: 'Face (facial features, complexion, skin condition).' },
        { id: 'q27', kind: 'scale', ru: 'Волосы (цвет, густота, структура).', en: 'Hair (color, thickness, texture).' },
        { id: 'q28', kind: 'scale', ru: 'Нижняя часть туловища (ягодицы, бёдра, ноги).', en: 'Lower torso (buttocks, hips, legs).' },
        { id: 'q29', kind: 'scale', ru: 'Средняя часть туловища (талия, живот).', en: 'Mid torso (waist, stomach).' },
        { id: 'q30', kind: 'scale', ru: 'Верхняя часть туловища (грудная клетка или грудь, плечи, руки).', en: 'Upper torso (chest/bust, shoulders, arms).' },
        { id: 'q31', kind: 'scale', ru: 'Мышечный тонус.', en: 'Muscle tone.' },
        { id: 'q32', kind: 'scale', ru: 'Вес.', en: 'Weight.' },
        { id: 'q33', kind: 'scale', ru: 'Рост.', en: 'Height.' },
        { id: 'q34', kind: 'scale', ru: 'Внешность в целом.', en: 'Overall appearance.' },
      ],
    },
  ],
  computeResult: (answers) => {
    const g = (id: string) => answers[id] ?? 0;
    const appearanceEval = round2((g('q3') + g('q5') + g('q9') + g('q12') + g('q15') - g('q18') - g('q19') + 12) / 7);
    const appearanceOrient = round2(
      (g('q1') + g('q2') + g('q6') + g('q7') + g('q10') + g('q13') + g('q17') + g('q21') - g('q11') - g('q14') - g('q16') - g('q20') + 24) / 12,
    );
    const bodyAreasSatisfaction = round2(
      (g('q26') + g('q27') + g('q28') + g('q29') + g('q30') + g('q31') + g('q32') + g('q33') + g('q34')) / 9,
    );
    const overweightPreoccupation = round2((g('q4') + g('q8') + g('q22') + g('q23')) / 4);
    const selfClassifiedWeight = round2((g('q24') + g('q25')) / 2);
    return {
      subscales: [
        {
          labelRu: 'Оценка внешности',
          labelEn: 'Appearance evaluation',
          score: appearanceEval,
          range: '1–5',
          typicalRu: 'типичный диапазон 2.5–4.2',
          typicalEn: 'typical range 2.5–4.2',
        },
        {
          labelRu: 'Ориентация на внешность',
          labelEn: 'Appearance orientation',
          score: appearanceOrient,
          range: '1–5',
          typicalRu: 'типичный диапазон 3.3–4.5',
          typicalEn: 'typical range 3.3–4.5',
        },
        {
          labelRu: 'Удовлетворённость параметрами тела',
          labelEn: 'Body areas satisfaction',
          score: bodyAreasSatisfaction,
          range: '1–5',
          typicalRu: 'типичный диапазон 2.5–4.0',
          typicalEn: 'typical range 2.5–4.0',
        },
        {
          labelRu: 'Озабоченность лишним весом',
          labelEn: 'Overweight preoccupation',
          score: overweightPreoccupation,
          range: '1–5',
          typicalRu: 'типичный диапазон 2.1–4.0',
          typicalEn: 'typical range 2.1–4.0',
        },
        {
          labelRu: 'Оценка собственного веса',
          labelEn: 'Self-classified weight',
          score: selfClassifiedWeight,
          range: '1–5',
          typicalRu: 'типичный диапазон 2.8–4.3',
          typicalEn: 'typical range 2.8–4.3',
        },
      ],
      overallRu:
        'Более высокие баллы по «Оценке внешности» и «Удовлетворённости параметрами тела» говорят о более позитивном отношении к своей внешности. Более высокие баллы по «Озабоченности лишним весом» говорят о большей тревоге и бдительности в отношении веса. «Типичный диапазон» показывает ориентировочные нормативные значения, а не клинический порог.',
      overallEn:
        'Higher scores on "Appearance evaluation" and "Body areas satisfaction" point to a more positive attitude toward one\'s appearance. Higher scores on "Overweight preoccupation" point to more anxiety and vigilance about weight. The "typical range" is an approximate normative reference, not a clinical cutoff.',
    };
  },
};

export const REAL_TESTS: RealTest[] = [staiTest, edeqTest, mbsrqTest];
