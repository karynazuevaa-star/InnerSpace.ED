// Clinical protocol text, transcribed verbatim from the psychologist's own
// Russian wording, with an English translation alongside it. The Russian
// stays the therapist's exact phrasing; the English is a careful rendering
// of the same instructions, not a loose paraphrase, since an imprecise
// translation of therapeutic instructions could change their meaning in a
// way that matters for how a session actually goes.
export interface TechniqueContent {
  title: string;
  goal: string;
  description: string;
  questions: string[];
  // Step-by-step script for the avatar page's own guide (the
  // "Попробовать"/"Try it" button - see MaterialsPage.tsx/AvatarToolPage.tsx
  // and TechniqueGuide.tsx). The Russian is the psychologist's own
  // step-by-step script for running this exercise, provided directly and
  // kept verbatim (same "exact wording matters" rule as the rest of this
  // file - see the top-of-file comment); the English is a careful
  // translation of it, not a summary. A step can hold more than one
  // sentence, and a few use an embedded line break (e.g. defusion's
  // wording progression) - TechniqueGuide.tsx renders this with
  // white-space: pre-line so those breaks survive. Optional because
  // SCREENING and PSYCHOEDUCATION entries below don't use this flow.
  avatarSteps?: string[];
}

export interface Technique {
  id: string;
  ru: TechniqueContent;
  en: TechniqueContent;
}

export const TECHNIQUES: Technique[] = [
  {
    id: 'defusion',
    ru: {
      title: 'Разделение с мыслями',
      goal: 'Развивать дистанцирование от автоматических мыслей о теле.',
      description: `Вы по согласованию с клиентом меняете одну область аватара. Клиент называет возникшую мысль, а потом постепенно меняет формулировку.

«Мой живот выглядит ужасно».
«У меня появилась мысль, что мой живот выглядит ужасно».
«Я замечаю, что у меня появилась мысль о том, что мой живот выглядит ужасно».

После этого клиент какое-то время просто смотрит на аватар, не пытаясь избавиться от мысли или сразу поправить изображение.`,
      questions: [
        'Насколько убедительной кажется мысль от 0 до 100?',
        'Какую эмоцию она вызывает?',
        'Насколько сильно хочется изменить аватар?',
        'Можно ли оставить аватар таким, продолжая замечать эту мысль?',
        'Какое значимое действие можно совершить, даже если мысль остаётся?',
      ],
      avatarSteps: [
        'Вместе с клиентом настройте аватар. Уточните, что персонаж не обязан точно воспроизводить его тело.',
        'Выберите одно изменение.',
        'Назовите возникшую мысль, не исправляя и не оспаривая её.\nНапример: «Этот живот выглядит ужасно».',
        'Насколько убедительной кажется эта мысль сейчас — от 0 до 100?',
        'Какую эмоцию она вызывает?',
        'Насколько сильно хочется изменить аватар? Например, уменьшить параметры или вернуть в исходное положение.',
        'Постепенно измените формулировку.\n«Мой живот выглядит ужасно» →\n«У меня появилась мысль, что мой живот выглядит ужасно» →\n«Я замечаю, что у меня появилась мысль о том, что мой живот выглядит ужасно».',
        'Побудьте с неизменённым аватаром. Можем ли мы пока оставить аватар таким и одновременно замечать эту мысль?',
        'Насколько убедительной кажется мысль сейчас — от 0 до 100?',
        'Что произошло с желанием изменить аватар?',
        'Завершите упражнение вместе. Обсудите, где в повседневной жизни могло бы пригодиться разделение.',
      ],
    },
    en: {
      title: 'Defusion from thoughts',
      goal: 'Build distance from automatic thoughts about the body.',
      description: `You change one area of the avatar together with the client's agreement. The client names the thought that comes up, then reshapes it step by step.

"My stomach looks awful."
"I'm having the thought that my stomach looks awful."
"I notice that I'm having the thought that my stomach looks awful."

After that the client spends a while simply looking at the avatar, without trying to get rid of the thought or fix the image right away.`,
      questions: [
        'How convincing does the thought feel, from 0 to 100?',
        'What emotion does it bring up?',
        'How strong is the urge to change the avatar?',
        'Can the avatar stay as it is while you keep noticing this thought?',
        'What meaningful action could you take even while the thought is still there?',
      ],
      avatarSteps: [
        "Set up the avatar together with the client. Make clear the character doesn't have to reproduce their body exactly.",
        'Choose one change to make.',
        'Have the client name the thought that comes up, without correcting or disputing it.\nFor example: "This stomach looks awful."',
        'How convincing does this thought feel right now, from 0 to 100?',
        'What emotion does it bring up?',
        'How strong is the urge to change the avatar? For example, to shrink the parameter or revert it.',
        'Gradually reshape the wording.\n"My stomach looks awful" →\n"I\'m having the thought that my stomach looks awful" →\n"I notice that I\'m having the thought that my stomach looks awful."',
        'Spend a while with the unchanged avatar. Can we leave the avatar as it is for now while still noticing this thought?',
        'How convincing does the thought feel now, from 0 to 100?',
        'What happened to the urge to change the avatar?',
        'Close the exercise together. Discuss where defusion could be useful in everyday life.',
      ],
    },
  },
  {
    id: 'nonjudgmental-description',
    ru: {
      title: 'Безоценочное описание',
      goal: 'Научиться описывать тело без критики, сравнений и оценочных суждений.',
      description: `Клиент воссоздаёт субъективный образ своего тела и сначала описывает его привычным способом. Вы помогаете заметить оценочные слова вроде «ужасный», «толстый», «неправильный», «некрасивый». Затем клиент повторяет описание, используя только нейтральные характеристики.

«У меня ужасно широкие бёдра» превращается в «Бёдра визуально шире талии».

Практика продолжается, пока клиент не начнёт довольно уверенно использовать безоценочный язык. Дальше этот навык переносится на восприятие своего тела за пределами платформы.`,
      questions: [
        'Какие слова здесь просто описание, а какие уже оценка?',
        'Что непосредственно видно на экране?',
        'Как можно сказать это нейтральнее?',
        'Как меняется эмоциональная реакция при безоценочном описании?',
      ],
      avatarSteps: [
        'Настройте аватар так, чтобы он отражал субъективное представление о своём теле.',
        'Попросите описать аватар привычными словами.',
        'Вместе найдите оценки. «Какие слова здесь описывают то, что видно, а какие выражают отношение или оценку?»',
        'Отделите наблюдаемое от интерпретации. Как это можно описать, не используя слова «хорошо», «плохо», «красиво» или «некрасиво»?',
        'Переформулируйте одну фразу на нейтральную.',
        'Повторите с несколькими убеждениями.',
        'Перенесите навык за пределы платформы в повседневные ситуации клиента.',
      ],
    },
    en: {
      title: 'Non-judgmental description',
      goal: 'Learn to describe the body without criticism, comparisons, or evaluative judgments.',
      description: `The client recreates their subjective image of their own body and first describes it in their usual way. You help them notice evaluative words like "awful," "fat," "wrong," "ugly." The client then repeats the description using only neutral characteristics.

"My hips are horribly wide" becomes "My hips are visually wider than my waist."

The practice continues until the client can use non-judgmental language fairly reliably. The skill then carries over to how the client sees their own body outside the platform.`,
      questions: [
        'Which words are description, and which are evaluation?',
        'What is directly visible on the screen?',
        'How could this be said more neutrally?',
        'How does the emotional reaction change with non-judgmental description?',
      ],
      avatarSteps: [
        "Set up the avatar to match the client's subjective sense of their own body.",
        'Ask the client to describe the avatar in their usual words.',
        'Find the evaluations together. "Which words here describe what\'s visible, and which express an attitude or judgment?"',
        'Separate what\'s observed from the interpretation. How could this be described without using words like "good," "bad," "pretty," or "ugly"?',
        'Reshape one phrase into a neutral one.',
        'Repeat with a few more beliefs.',
        "Carry the skill beyond the platform into the client's everyday situations.",
      ],
    },
  },
  {
    id: 'observing-reaction',
    ru: {
      title: 'Наблюдение за реакцией',
      goal: 'Разделить наблюдаемые характеристики аватара, автоматические мысли и эмоциональные реакции.',
      description: `Клиент смотрит на аватар и сначала называет только то, что непосредственно видит. Затем отдельно отмечает возникающие мысли, оценки, эмоции и импульсы. Их не нужно подавлять или исправлять. После этого клиент возвращает внимание от отдельных зон к изображению тела целиком.`,
      questions: [
        'Что вы непосредственно видите?',
        'Какая мысль появилась?',
        'Какую эмоцию она вызвала?',
        'Что вам захотелось сделать?',
        'Насколько сильно хочется изменить или избежать образа?',
        'Что изменяется, когда вы смотрите на тело целиком?',
      ],
      avatarSteps: [
        'Настройте аватар так, чтобы он отражал субъективное представление о своём теле.',
        'Опишите то, что непосредственно видно на экране, без выводов о том, хорошо это или плохо.',
        'Назовите мысль или оценку, которая появилась при взгляде на аватар.',
        'Какую эмоцию вызвала эта мысль?',
        'Что захотелось сделать (изменить аватар, отвернуться, продолжить рассматривать)?',
        'Переведите взгляд с отдельной области на аватар в целом. Не ищите «хорошие» части тела и не оценивайте общий вид.',
        'Что вы замечаете, когда смотрите на изображение целиком, а не только на одну область?',
        'Что происходило, когда внимание было сосредоточено на одной области?',
        'Что изменилось или не изменилось при взгляде на аватар целиком?',
        'Можете ли вы сейчас различить увиденное, мысль, эмоцию и желание действовать? Давайте попробуем вместе.',
        'Завершите упражнение.',
      ],
    },
    en: {
      title: 'Observing the reaction',
      goal: "Separate the avatar's observable features from automatic thoughts and emotional reactions.",
      description: `The client looks at the avatar and first names only what they directly see. They then separately note any thoughts, judgments, emotions, and impulses that come up. These don't need to be suppressed or corrected. The client then shifts attention from individual areas back to the body as a whole.`,
      questions: [
        'What do you directly see?',
        'What thought came up?',
        'What emotion did it bring up?',
        'What did you feel like doing?',
        'How strong is the urge to change or avoid the image?',
        'What changes when you look at the whole body?',
      ],
      avatarSteps: [
        "Set up the avatar to match the client's subjective sense of their own body.",
        "Describe what's directly visible on screen, without concluding whether it's good or bad.",
        'Name the thought or judgment that came up looking at the avatar.',
        'What emotion did that thought bring up?',
        'What did you feel like doing (changing the avatar, looking away, continuing to look)?',
        'Shift your gaze from the single area to the avatar as a whole. Don\'t look for the "good" body parts or judge the overall look.',
        'What do you notice looking at the whole image, rather than just one area?',
        'What was happening while attention was fixed on one area?',
        "What changed, or didn't change, when you looked at the whole avatar?",
        "Can you tell apart what you saw, the thought, the emotion, and the urge to act, right now? Let's try together.",
        'Close the exercise.',
      ],
    },
  },
  {
    id: 'current-desired-tolerable',
    ru: {
      title: 'Текущее, желаемое и переносимое тело',
      goal: 'Исследовать расхождение между субъективным образом себя, телесным идеалом и приемлемым диапазоном внешности.',
      description: `Клиент создаёт три версии аватара.

1. Как он воспринимает своё тело сейчас.
2. Как он хотел бы выглядеть.
3. Какое тело отличается от желаемого, но остаётся переносимым.

Вы сравниваете параметры аватаров, эмоциональные реакции и распределение зрительного внимания. Первая версия обозначается как субъективно воспринимаемое тело, а не объективное.`,
      questions: [
        'Чем различаются три версии?',
        'Какая область изменилась сильнее всего?',
        'Почему именно эти параметры важны?',
        'Что делает третью версию переносимой?',
        'Можно ли расширить диапазон приемлемых изменений?',
        'Что, по вашему мнению, гарантирует желаемое тело?',
      ],
      avatarSteps: [
        'Вы создадите три версии аватара и обсудите не «правильность» тела, а мысли и чувства, возникающие при взгляде на разные образы. Вы готовы?',
        'Создайте образ «как я воспринимаю себя сейчас». Зафиксируйте скриншотом.',
        'Создайте желаемый образ.',
        'Что, по вашему ощущению, изменилось бы в жизни, если бы тело выглядело так?',
        'Что, как вам кажется, должно гарантировать такое тело?',
        'Что здесь для вас особенно важно?',
        'Зафиксируйте скриншотом.',
        'Создайте переносимый вариант. Компромисс между первым и вторым. Зафиксируйте скриншотом.',
        'Сравните три версии. Чем они отличаются?',
        'Какая область изменилась сильнее всего?',
        'Почему именно эти параметры оказались важными?',
        'Для каждой версии отдельно заметьте, какие мысли и эмоции она вызывает и куда в первую очередь направляется взгляд.',
        'Исследуйте границы переносимости. Что помогает оставаться с этим образом, несмотря на отличие от желаемого?',
        'Можно ли расширить диапазон приемлемых изменений?',
        'Завершите технику.',
      ],
    },
    en: {
      title: 'Current, desired, and tolerable body',
      goal: "Explore the gap between the client's subjective self-image, their body ideal, and an acceptable range of appearance.",
      description: `The client creates three versions of the avatar.

1. How they perceive their body right now.
2. How they would like to look.
3. A body that differs from the desired one but is still tolerable.

You compare the avatars' parameters, emotional reactions, and visual attention distribution. The first version is labeled as the subjectively perceived body, not the objective one.`,
      questions: [
        'How do the three versions differ?',
        'Which area changed the most?',
        'Why do these particular parameters matter?',
        'What makes the third version tolerable?',
        'Can the range of acceptable variation be widened?',
        'What do you believe the desired body would guarantee you?',
      ],
      avatarSteps: [
        'You\'ll build three versions of the avatar and discuss not whether a body is "right," but the thoughts and feelings that come up looking at each image. Ready?',
        'Build the image of "how I perceive myself right now." Save it as a screenshot.',
        'Build the desired image.',
        'What do you sense would change in your life if your body looked like this?',
        'What do you feel this body would guarantee you?',
        'What matters most to you here?',
        'Save it as a screenshot.',
        'Build a tolerable version - a compromise between the first and second. Save it as a screenshot.',
        'Compare the three versions. How do they differ?',
        'Which area changed the most?',
        'Why did these particular parameters turn out to matter?',
        'For each version separately, notice what thoughts and emotions it brings up and where your gaze goes first.',
        'Explore the limits of tolerability. What helps you stay with this image despite it differing from the desired one?',
        'Can the range of acceptable variation be widened?',
        'Close the technique.',
      ],
    },
  },
  {
    id: 'discrimination-threshold',
    ru: {
      title: 'Поиск порога различения',
      goal: 'Исследовать чувствительность клиента к небольшим изменениям тела и уверенность в их распознавании.',
      description: `Вы незаметно для клиента делаете небольшое изменение одного параметра. Клиент говорит, заметил ли он изменение и в какую сторону. Часть проб можно проводить вообще без изменения, чтобы проверить, не возникает ли ожидание перемены само по себе.

Техника показывает своего рода парадокс. Человек может уделять зоне очень много внимания и всё равно не всегда точно определять, что именно поменялось при небольшом изменении.`,
      questions: [
        'Было ли изменение?',
        'В какую сторону изменился параметр?',
        'Насколько вы уверены в ответе от 0 до 100?',
        'На что вы ориентировались?',
        'Что вы чувствуете, когда не можете точно определить изменение?',
        'Обязательно ли неопределённость означает, что нужно смотреть внимательнее?',
      ],
      avatarSteps: [
        'Проведём несколько коротких проб: иногда один параметр аватара будет немного меняться, а иногда изображение останется прежним. В каждой пробе вам нужно будет сказать, заметили ли вы изменение и какое.',
        'Создайте и зафиксируйте исходный образ.',
        'Психолог меняет или не меняет один параметр, а клиент закрывает глаза.',
        'Как вам кажется, было ли изменение? Если да, то в какую сторону?',
        'Повторите несколько раз.',
        'Раскройте последовательность проб. Были ли случаи, когда уверенность была высокой, но изменения не было, или наоборот?',
        'Что вы чувствовали, когда не могли точно определить, изменилось ли изображение?',
        'Возникало ли желание смотреть дольше или проверять снова?',
        'Была ли зона, на которой вы фиксировались дольше или перепроверяли чаще?',
        'Завершите упражнение.',
      ],
    },
    en: {
      title: 'Finding the discrimination threshold',
      goal: "Explore the client's sensitivity to small body changes and their confidence in identifying them.",
      description: `You make a very small change to one parameter without the client seeing it happen. The client reports whether they noticed a change and in which direction. Some trials can involve no change at all, to check whether the expectation of change shows up on its own.

The technique reveals a kind of paradox. A person can pay a lot of attention to a certain area and still not reliably tell what exactly changed when the change is small.`,
      questions: [
        'Was there a change?',
        'Which direction did the parameter change in?',
        'How confident are you in your answer, from 0 to 100?',
        'What were you basing that on?',
        "What do you feel when you can't pin down the change exactly?",
        'Does uncertainty necessarily mean you need to look more closely?',
      ],
      avatarSteps: [
        "We'll run a few short trials: sometimes one avatar parameter will change slightly, sometimes the image will stay the same. Each trial, you'll say whether you noticed a change, and which one.",
        'Build and save the starting image.',
        "The specialist changes, or doesn't change, one parameter, and the client closes their eyes.",
        'Do you think there was a change? If so, in which direction?',
        'Repeat a few times.',
        'Reveal the sequence of trials. Were there cases where confidence was high but there was no change, or the other way around?',
        "What did you feel when you couldn't pin down whether the image had changed?",
        'Did you feel the urge to look longer, or check again?',
        'Was there a zone you fixated on longer, or rechecked more often?',
        'Close the exercise.',
      ],
    },
  },
  {
    id: 'preventing-correction',
    ru: {
      title: 'Предотвращение исправления',
      goal: 'Исследовать импульс к компульсивной коррекции тела и потренировать паузу перед действием.',
      description: `Клиент создаёт аватар и замечает желание снова что-то изменить, например уменьшить живот, сузить талию, добиться симметрии или вернуть идеальную версию. Вместо того чтобы сразу это исправлять, вы вместе договариваетесь сделать паузу. Во время паузы клиент наблюдает за импульсом и тревогой и за тем, как они меняются, не трогая ползунок.`,
      questions: [
        'Что именно хочется исправить?',
        'Что, по вашему прогнозу, произойдёт, если этого не сделать?',
        'Насколько сильны тревога и импульс от 0 до 100?',
        'Как импульс меняется во время паузы?',
        'Можно ли оставить аватар неидеальным ещё на некоторое время?',
        'Что вы узнали, не выполняя привычное действие?',
      ],
      avatarSteps: [
        'Настройте аватар так, чтобы он отражал субъективное представление о своём теле.',
        'Заметьте, есть ли желание что-то изменить (сузить талию, уменьшить бёдра и т. д.).',
        'Сделайте паузу и понаблюдайте за импульсом и тревогой и за тем, как они меняются, не трогая ползунок.',
        'Что именно хочется исправить?',
        'Что, по вашему прогнозу, произойдёт, если этого не сделать?',
        'Насколько сильны тревога и импульс от 0 до 100?',
        'Как импульс меняется во время паузы?',
        'Можно ли оставить аватар неидеальным ещё на некоторое время?',
        'Что вы узнали, не выполняя привычное действие?',
        'Завершите упражнение.',
      ],
    },
    en: {
      title: 'Preventing correction',
      goal: 'Explore the impulse toward compulsive body correction and practice pausing before acting on it.',
      description: `The client creates an avatar and notices the wish to change something again, for example shrinking the stomach, narrowing the waist, aiming for symmetry, or going back to an "ideal" version. Instead of fixing it right away, you agree together to pause. During the pause the client watches the impulse and the anxiety, and how they shift, without touching the slider.`,
      questions: [
        'What exactly do you want to fix?',
        "What do you predict will happen if you don't?",
        'How strong are the anxiety and the impulse, from 0 to 100?',
        'How does the impulse change during the pause?',
        'Can the avatar stay imperfect for a while longer?',
        'What did you learn by not doing the usual thing?',
      ],
      avatarSteps: [
        "Set up the avatar to match the client's subjective sense of their own body.",
        'Notice whether there\'s a wish to change something (narrow the waist, shrink the hips, and so on).',
        'Pause and watch the impulse and the anxiety, and how they shift, without touching the slider.',
        'What exactly do you want to fix?',
        "What do you predict will happen if you don't?",
        'How strong are the anxiety and the impulse, from 0 to 100?',
        'How does the impulse change during the pause?',
        'Can the avatar stay imperfect for a while longer?',
        'What did you learn by not doing the usual thing?',
        'Close the exercise.',
      ],
    },
  },
  {
    id: 'attention-zones',
    ru: {
      title: 'Привлекательные, нейтральные и непривлекательные зоны',
      goal: 'Исследовать негативный фильтр и особенности распределения внимания между областями тела.',
      description: `До включения айтрекинга клиент делит области аватара на привлекательные, нейтральные и те, что вызывают недовольство. После свободного просмотра вы сравниваете эту субъективную карту с тем, куда реально смотрел клиент.

Здесь возможно несколько объяснений. Внимание может задерживаться на непривлекательных областях, приятные зоны могут игнорироваться, проблемные зоны могут избегаться, а взгляд может постоянно возвращаться к точкам сравнения. Это темы для совместного обсуждения с клиентом, а не готовые выводы.`,
      questions: [
        'Какие зоны притягивают внимание?',
        'Какие почти не рассматриваются?',
        'Совпадает ли это с вашими ожиданиями?',
        'Что вы пытаетесь выяснить, возвращаясь к определённой зоне?',
        'Малое количество фиксаций означает безразличие или избегание?',
        'Как изменится восприятие, если рассматривать тело целиком?',
      ],
      avatarSteps: [
        'Настройте аватар так, чтобы он отражал субъективное представление о своём теле.',
        'Разделите аватар на области — привлекательные, нейтральные, непривлекательные.',
        'Настройте айтрекинг и свободно осмотрите аватар.',
        'Сравните карту взгляда с субъективной картой.',
        'Какие зоны притягивают внимание? Какие почти не рассматриваются?',
        'Совпадает ли это с вашими ожиданиями?',
        'Малое количество фиксаций означает безразличие или избегание?',
        'Как изменится восприятие, если рассматривать тело целиком?',
        'Завершите упражнение.',
      ],
    },
    en: {
      title: 'Attractive, neutral, and unattractive zones',
      goal: 'Explore the negative filter and how attention is distributed across body areas.',
      description: `Before turning on eye tracking, the client sorts the avatar's areas into attractive, neutral, and dissatisfaction-provoking. After a period of free viewing, you compare this subjective map with where the client actually looked.

Several explanations are possible here. Attention might stay fixed on unattractive areas, pleasant areas might get ignored, problem areas might get avoided, or the gaze might keep returning to comparison points. These are topics to discuss with the client together, not ready-made conclusions.`,
      questions: [
        'Which zones draw attention?',
        'Which are barely looked at?',
        'Does this match what you expected?',
        'What are you trying to find out by returning to a particular zone?',
        'Does a low number of fixations mean indifference, or avoidance?',
        'How does perception change when you look at the body as a whole?',
      ],
      avatarSteps: [
        "Set up the avatar to match the client's subjective sense of their own body.",
        'Sort the avatar into areas - attractive, neutral, unattractive.',
        'Turn on eye tracking and freely look over the avatar.',
        'Compare the gaze map with the subjective map.',
        'Which zones draw attention? Which are barely looked at?',
        'Does this match what you expected?',
        'Does a low number of fixations mean indifference, or avoidance?',
        'How does perception change when you look at the whole body?',
        'Close the exercise.',
      ],
    },
  },
  {
    id: 'first-third-person',
    ru: {
      title: 'Взгляд от первого и третьего лица',
      goal: 'Исследовать самокритику, двойные стандарты и предполагаемую оценку окружающих.',
      description: `Вы показываете клиенту один и тот же аватар и поочерёдно предлагаете представить, что это его собственное тело, тело незнакомого человека и тело близкого ему человека. Сам аватар при этом не меняется. Клиент сравнивает мысли и эмоции, которые возникают в каждом случае.`,
      questions: [
        'Что вы думаете, когда воспринимаете этот аватар как себя?',
        'Что бы вы подумали, если бы это был незнакомый человек?',
        'Что бы вы сказали близкому человеку с таким телом?',
        'Какие стандарты вы применяете только к себе?',
        'Почему одинаковое тело получает разные оценки?',
        'Как можно отнестись к себе по тем же принципам, что и к близкому?',
      ],
      avatarSteps: [
        'Настройте аватар так, чтобы он отражал субъективное представление о своём теле.',
        'Что вы думаете, когда воспринимаете этот аватар как себя?',
        'Что бы вы подумали, если бы это был незнакомый человек?',
        'Что бы вы сказали близкому человеку с таким телом? Например, родственнице или близкой подруге.',
        'Какие стандарты вы применяете только к себе?',
        'Почему одинаковое тело получает разные оценки?',
        'Как можно отнестись к себе по тем же принципам, что и к близкому?',
        'Завершите упражнение.',
      ],
    },
    en: {
      title: 'First-person and third-person view',
      goal: "Explore self-criticism, double standards, and assumptions about how others would judge you.",
      description: `You show the client the same avatar and, in turn, ask them to imagine it as their own body, as a stranger's body, and as the body of someone close to them. The avatar itself never changes. The client compares the thoughts and emotions that come up each time.`,
      questions: [
        'What do you think when you see this avatar as yourself?',
        'What would you think if this were a stranger?',
        'What would you say to someone close to you who had this body?',
        'What standards do you apply only to yourself?',
        'Why does the same body get different evaluations?',
        'How could you treat yourself by the same standards you use for someone close to you?',
      ],
      avatarSteps: [
        "Set up the avatar to match the client's subjective sense of their own body.",
        'What do you think when you see this avatar as yourself?',
        'What would you think if this were a stranger?',
        'What would you say to someone close to you who had this body? A relative, say, or a close friend.',
        'What standards do you apply only to yourself?',
        'Why does the same body get different evaluations?',
        'How could you treat yourself by the same standards you use for someone close to you?',
        'Close the exercise.',
      ],
    },
  },
  {
    id: 'mood-influence',
    ru: {
      title: 'Влияние настроения на образ тела',
      goal: 'Показать, что оценка тела может изменяться под влиянием эмоционального состояния, даже если тело остаётся прежним.',
      description: `Клиент оценивает один и тот же, ничем не изменённый аватар несколько раз за сессию. Это происходит в начале встречи, после обсуждения ситуации критики, после стабилизирующего упражнения и в конце сессии. Вы сравниваете, как менялись удовлетворённость телом, тревога, желание изменить аватар и распределение внимания.`,
      questions: [
        'Изменился ли аватар?',
        'Как изменилась его оценка?',
        'Что происходило с настроением между оценками?',
        'Какие зоны стали заметнее?',
        'Может ли ощущение «я выгляжу хуже» отражать эмоциональное состояние?',
        'Что поможет проверить это вне платформы?',
      ],
      avatarSteps: [
        'Посмотрите на аватар.',
        'Оцените его. Насколько такие параметры кажутся вам привлекательными или непривлекательными?',
        'Вернитесь к нему в конце вашей сессии.',
        'Посмотрите на аватар ещё раз. Как вы сейчас к нему относитесь? Что происходило до этого? Что происходило с настроением между оценками?',
        'Изменился ли аватар? Как изменилась его оценка? Какие зоны стали заметнее?',
        'Может ли ощущение «я выгляжу хуже» отражать эмоциональное состояние?',
        'Что поможет проверить это вне платформы?',
        'Завершите упражнение.',
      ],
    },
    en: {
      title: "Mood's influence on body image",
      goal: "Show that body evaluation can shift with emotional state, even when the body itself stays the same.",
      description: `The client evaluates the exact same, unchanged avatar several times during the session. This happens at the start, after discussing a situation involving criticism, after a stabilizing exercise, and at the end of the session. You compare how body satisfaction, anxiety, the wish to change the avatar, and attention distribution shifted across these points.`,
      questions: [
        'Did the avatar change?',
        'How did the evaluation of it change?',
        'What was happening with your mood between evaluations?',
        'Which areas became more noticeable?',
        'Could the feeling "I look worse" reflect your emotional state?',
        'What could help you check this outside the platform?',
      ],
      avatarSteps: [
        'Look at the avatar.',
        'Rate it. How attractive or unattractive do these parameters feel to you?',
        'Come back to it at the end of your session.',
        'Look at the avatar again. How do you feel about it now? What had happened before that? What was happening with your mood between ratings?',
        'Did the avatar change? How did your rating of it change? Which areas became more noticeable?',
        'Could the feeling "I look worse" reflect your emotional state?',
        'What could help you check this outside the platform?',
        'Close the exercise.',
      ],
    },
  },
  {
    id: 'ideal-acceptable',
    ru: {
      title: 'Идеальный и достаточно приемлемый аватар',
      goal: 'Исследовать происхождение, нестабильность и цену телесного идеала.',
      description: `Клиент создаёт идеальную версию аватара. Затем вы вместе разбираете, откуда взялись выбранные параметры и чего будет стоить постоянно им соответствовать. После обсуждения клиент создаёт уже не идеальный, а достаточно приемлемый аватар, совместимый со здоровьем, отношениями и полноценной жизнью.`,
      questions: [
        'Откуда появились эти представления об идеальном теле?',
        'Какие люди, изображения или комментарии на них повлияли?',
        'Гарантирует ли такое тело принятие и безопасность?',
        'Останется ли этот идеал прежним через год?',
        'Что потребуется для его постоянного поддержания?',
        'От чего придётся отказаться?',
        'Каким может быть достаточно приемлемое тело?',
      ],
      avatarSteps: [
        'Настройте аватар так, чтобы воссоздать идеальную версию фигуры для вас.',
        'Откуда появились эти представления об идеальном теле? Какие люди, изображения или комментарии на них повлияли?',
        'Гарантирует ли такое тело принятие и безопасность?',
        'Останется ли этот идеал прежним через год? Менялось ли понятие идеала спустя время раньше?',
        'Что потребуется для его постоянного поддержания? От чего придётся отказаться?',
        'Каким может быть достаточно приемлемое тело? Создайте достаточно приемлемый аватар, совместимый со здоровьем, отношениями и полноценной жизнью.',
        'Завершите упражнение.',
      ],
    },
    en: {
      title: 'Ideal vs. good-enough avatar',
      goal: 'Explore the origin, instability, and cost of the body ideal.',
      description: `The client creates an "ideal" version of the avatar. Then you work through together where the chosen parameters came from and what it would cost to constantly live up to them. After the discussion, the client creates not an ideal but a good-enough avatar, one that's compatible with health, relationships, and a full life.`,
      questions: [
        'Where did these ideas about an ideal body come from?',
        'Which people, images, or comments shaped them?',
        'Does having that body guarantee acceptance and safety?',
        'Will this ideal still be the same a year from now?',
        'What would it take to maintain it indefinitely?',
        'What would you have to give up for it?',
        'What could a good-enough body look like?',
      ],
      avatarSteps: [
        'Set up the avatar to recreate your ideal version of the figure.',
        'Where did these ideas about an ideal body come from? Which people, images, or comments shaped them?',
        'Does having that body guarantee acceptance and safety?',
        'Will this ideal still be the same a year from now? Has your idea of the ideal changed over time before?',
        'What would it take to maintain it indefinitely? What would you have to give up?',
        "What could a good-enough body look like? Build a good-enough avatar, one that's compatible with health, relationships, and a full life.",
        'Close the exercise.',
      ],
    },
  },
  {
    id: 'reaction-prediction',
    ru: {
      title: 'Предсказание реакции',
      goal: 'Проверить пугающие ожидания и развивать переносимость изменений тела без немедленного исправления аватара.',
      description: `Клиент выбирает один параметр (живот, талию, бёдра, руки или общий объём тела). До изменения он оценивает по шкале от 0 до 100, насколько тревожно ему будет и насколько сильно захочется вернуть всё как было. Вы по согласованию с клиентом передвигаете ползунок, и клиент какое-то время просто смотрит на аватар, не исправляя его.

Затем вы фиксируете реальные эмоции, мысли, импульс отменить изменение, а потом сравниваете прогноз с тем, что произошло на самом деле.

Таким образом, вы исследуете с клиентом, что предсказания могут быть разными и необязательно отражать реальность.`,
      questions: [
        'Какой реакции вы ожидаете?',
        'Что это изменение будет для вас означать?',
        'Насколько сильной будет тревога?',
        'Что, по вашему прогнозу, произойдёт, если оставить аватар таким?',
        'Совпала ли реальная реакция с ожиданием?',
        'Изменилась ли тревога без возвращения ползунка?',
        'Что нового вы узнали?',
      ],
      avatarSteps: [
        'Выберите один параметр (живот, талию, бёдра, руки или общий объём тела).',
        'Насколько вам тревожно, если эта часть вас увеличится или уменьшится? Оцените от 0 до 100.',
        'Какой реакции вы ожидаете от изменения части? Что это изменение будет для вас означать?',
        'Что, по вашему прогнозу, произойдёт, если изменить аватар?',
        'Психолог медленно перемещает ползунок для изменения параметров.',
        'Какова ваша реакция сейчас? Совпала ли реальная реакция с ожиданием?',
        'Завершите технику.',
      ],
    },
    en: {
      title: 'Predicting the reaction',
      goal: 'Test frightening expectations and build tolerance for body changes without immediately correcting the avatar.',
      description: `The client picks one parameter (stomach, waist, hips, arms, or overall body volume). Before the change, they rate on a 0 to 100 scale how anxious they expect to feel and how strong the urge to revert will be. You move the slider with the client's agreement, and the client spends a while just looking at the avatar without correcting it.

Then you record the actual emotions, thoughts, and the impulse to undo the change, and compare the prediction with what actually happened.

In this way, you and the client explore how predictions can vary and don't necessarily reflect reality.`,
      questions: [
        'What reaction do you expect?',
        'What would this change mean for you?',
        'How strong will the anxiety be?',
        'What do you predict will happen if the avatar stays like this?',
        'Did the actual reaction match the expectation?',
        'Did the anxiety change without moving the slider back?',
        'What did you learn?',
      ],
      avatarSteps: [
        'Pick one parameter (stomach, waist, hips, arms, or overall body volume).',
        'How anxious would you feel if this part of you got bigger or smaller? Rate it from 0 to 100.',
        'What reaction do you expect from changing this part? What would this change mean for you?',
        'What do you predict will happen if the avatar is changed?',
        'The specialist slowly moves the slider to change the parameter.',
        "What's your reaction right now? Did the actual reaction match the expectation?",
        'Close the technique.',
      ],
    },
  },
];

export const SCREENING: Technique[] = [
  {
    id: 'body-image-dynamics',
    ru: {
      title: 'Динамика субъективного образа тела',
      goal: 'Исследовать, насколько восприятие собственного тела изменяется между сессиями и связано ли оно с эмоциональным состоянием.',
      description: `В начале каждой сессии клиент настраивает аватар так, как он воспринимает форму своего тела прямо сейчас. Вы сохраняете получившиеся версии с датой сессии и потом сравниваете их между собой.

Заметные различия между версиями могут говорить о том, что субъективный образ тела у клиента нестабилен, особенно если эти различия больше, чем вероятные реальные изменения тела за прошедшее время.

Перед настройкой аватара можно дополнительно измерить ситуативную тревогу. Так вы сможете проверить, связан ли рост тревоги с тем, что меняется воспринимаемый размер или отдельные пропорции тела.

Сохраняйте не только картинку, но и числовые значения параметров. Скриншоты и результаты относятся к чувствительным клиническим данным, храните их только с согласия клиента и в защищённой системе.`,
      questions: [
        'Чем сегодняшний аватар отличается от предыдущего?',
        'Какие области изменились сильнее всего?',
        'Произошли ли за это время реальные изменения тела?',
        'Как вы чувствовали себя перед настройкой аватара?',
        'Что происходило в течение недели?',
        'Связано ли восприятие тела с тревогой, настроением, критикой или сравнением себя с другими?',
        'Какая версия кажется наиболее достоверной сейчас?',
      ],
    },
    en: {
      title: "Dynamics of subjective body image",
      goal: "Explore how much a client's body perception shifts between sessions and whether it relates to emotional state.",
      description: `At the start of each session, the client sets up the avatar to match how they perceive the shape of their body right now. You save the resulting versions with the session date and compare them against each other over time.

Noticeable differences between versions can suggest that the client's subjective body image is unstable, especially when those differences are larger than any plausible real physical change over that period.

Before adjusting the avatar, you can also measure situational anxiety. That lets you check whether a rise in anxiety is tied to a shift in perceived size or specific body proportions.

Save not just the image but the numeric parameter values too. Screenshots and results are sensitive clinical data, so store them only with the client's consent and in a secure system.`,
      questions: [
        "How does today's avatar differ from the previous one?",
        'Which areas changed the most?',
        'Did any real physical changes happen during this time?',
        'How were you feeling before adjusting the avatar?',
        'What happened over the past week?',
        'Does your body perception relate to anxiety, mood, criticism, or comparing yourself to others?',
        'Which version feels most accurate right now?',
      ],
    },
  },
  {
    id: 'satisfaction-attention-map',
    ru: {
      title: 'Карта удовлетворённости и зрительного внимания',
      goal: 'Сопоставить субъективную удовлетворённость областями тела с распределением взгляда.',
      description: `Клиент проходит MBSRQ, и вы вместе создаёте аватар, который соответствует его субъективному восприятию себя. Дальше вы проводите короткий свободный просмотр с айтрекингом.

Вы сопоставляете результаты MBSRQ со временем взгляда на разные области, количеством фиксаций, возвращениями к отдельным зонам и возможным избеганием некоторых областей.

Техника может помочь заметить зоны, которые клиент не назвал значимыми, но куда регулярно возвращается его взгляд. При этом айтрекинг не раскрывает «скрытые проблемы» сам по себе. Фиксация взгляда может отражать тревогу, интерес, проверку или просто особенности самого изображения.`,
      questions: [
        'Что вы думаете о результатах MBSRQ?',
        'Совпали ли они с вашими ожиданиями?',
        'Что вы замечаете в распределении взгляда?',
        'Какие зоны притягивают внимание?',
        'Какие зоны почти не рассматривались?',
        'Сколько времени вы уделяете этим областям в повседневной жизни?',
        'Рассматриваете, сравниваете или ощупываете ли вы их?',
        'Стараетесь ли вы скрывать или избегать эти зоны?',
        'Что ещё может объяснять такой паттерн взгляда?',
      ],
    },
    en: {
      title: 'Satisfaction and visual attention map',
      goal: "Compare subjective satisfaction with body areas against where the client's gaze actually goes.",
      description: `The client completes the MBSRQ, and you build an avatar together that matches their subjective self-perception. Then you run a short free-viewing period with eye tracking.

You compare the MBSRQ results against time spent looking at different areas, number of fixations, returns to particular zones, and possible avoidance of certain areas.

The technique can help surface zones the client didn't name as significant but that their gaze keeps returning to. Eye tracking doesn't reveal "hidden problems" on its own, though. A fixation can reflect anxiety, interest, checking, or simply features of the image itself.`,
      questions: [
        'What do you think about your MBSRQ results?',
        'Did they match what you expected?',
        'What do you notice about where your gaze went?',
        'Which zones draw attention?',
        'Which zones were barely looked at?',
        'How much time do you spend on these areas in everyday life?',
        'Do you look at, compare, or touch them?',
        'Do you try to hide or avoid these zones?',
        'What else could explain this gaze pattern?',
      ],
    },
  },
];

// Brief instrument descriptions for the "Screening" folder. BASS, EDE-Q 6.0
// and STAI (formerly summarized here, and duplicated again as filtered
// cards on the Tests page) now live as full interactive instruments in
// content/tests.ts - BASS specifically became redundant once the MBSRQ test
// there absorbed it as a subscale (its Body Areas Satisfaction subscale is
// exactly BASS). Only eye tracking - a methodology note, not a scorable
// test - stays here.
export interface InstrumentContent {
  title: string;
  summary: string;
  description: string;
  useCases: string[];
}

export interface Instrument {
  id: string;
  showOnTestsPage: boolean;
  // Optional demo clip (muted, looping) shown beside the text in the
  // instrument's modal. Served from /public, same for both languages.
  video?: string;
  ru: InstrumentContent;
  en: InstrumentContent;
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'eye-tracking',
    showOnTestsPage: false,
    video: '/materials/eye-tracking-demo.mp4?v=3',
    ru: {
      title: 'Айтрекинг',
      summary: 'Веб-камера отслеживает взгляд для карты визуального внимания на аватаре.',
      description: `Айтрекинг в InnerSpace.ED работает через обычную веб-камеру, а не специализированный инфракрасный айтрекер. После короткой калибровки браузер локально оценивает, куда смотрит клиент, пока тот рассматривает аватар, и строит по этим данным тепловую карту зрительного внимания. Всё вычисляется локально — видео с камеры никуда не передаётся и не сохраняется. Точность здесь заметно ниже, чем у специализированных айтрекеров, и зависит от освещения, положения головы и качества калибровки.

Результаты стоит воспринимать как ориентировочные и качественные, как материал для совместного обсуждения с клиентом, а не как точный количественный клинический показатель.`,
      useCases: [
        'Сравнить, куда клиент ожидал смотреть дольше всего, с тем, куда он смотрел на самом деле.',
        'Сопоставить с результатами опросников (например, MBSRQ или BASS) — увидеть расхождения между тем, что клиент называет значимым, и тем, куда возвращается взгляд.',
        'Повторить через время, чтобы отследить динамику — меняется ли паттерн внимания в ходе терапии.',
        'Использовать как материал для совместного обсуждения с клиентом, а не заменять им самоотчёт.',
      ],
    },
    en: {
      title: 'Eye tracking',
      summary: 'Webcam-based gaze tracking for a visual-attention map on the avatar.',
      description: `Eye tracking in InnerSpace.ED runs on a plain webcam, not a dedicated infrared eye tracker. After a short calibration, the browser estimates locally where the client is looking while they view the avatar, and builds a heatmap of visual attention from that. Everything is computed locally - the camera video is never sent anywhere or saved. Accuracy here is noticeably lower than with a dedicated eye tracker, and it depends on lighting, head position, and calibration quality.

Treat the results as approximate and qualitative, material for discussing with the client, rather than a precise quantitative clinical measure.`,
      useCases: [
        'Compare where the client expected to look longest with where they actually looked.',
        'Cross-check against questionnaire results (e.g. MBSRQ or BASS) - spot gaps between what the client calls significant and where their gaze keeps returning.',
        'Repeat over time to track dynamics - whether the attention pattern shifts over the course of therapy.',
        "Use as material for discussion with the client, not as a replacement for self-report.",
      ],
    },
  },
];

// Psychoeducation materials for the Materials page's "Psychoeducation"
// folder. Empty for now - no content has been provided yet - the page
// shows a placeholder message when this list is empty.
export const PSYCHOEDUCATION: Technique[] = [];
