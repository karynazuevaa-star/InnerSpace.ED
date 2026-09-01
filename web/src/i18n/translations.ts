export type Lang = 'ru' | 'en';

export const translations: Record<Lang, Record<string, string>> = {
  ru: {
    'app.subtitle': 'Визуализация тела для терапевтической работы',

    'nav.home': 'Главная',
    'nav.avatar': 'Аватар',
    'nav.materials': 'Материалы',
    'nav.tests': 'Тесты',

    'landing.eyebrow': 'Часть эко-системы InnerSpace',
    'landing.lead':
      'Инструмент, созданный клиническими психологами, для терапевтической работы с образом тела при расстройствах пищевого поведения.',
    'landing.cta': 'Исследовать сайт',
    'landing.disclaimer':
      'Инструмент предназначен для использования вместе со специалистом, а не для самостоятельной неконтролируемой работы.',
    'landing.disclaimerPrivacy':
      'InnerSpace.ED не собирает и не хранит данные и не несёт ответственности за сессии, которые специалисты проводят с использованием этого инструмента.',
    'landing.modelCredit':
      'Модели Bathroom scale, Kettlebell и Dumbbell от Poly by Google, Salad Bowl от Jarlan Perez, лицензия CC BY.',

    'tour.avatarCaption': 'Место, где можно работать с образом тела через виртуального аватара.',
    'tour.materialsCaption': 'Упражнения, скрининги и психообразование.',
    'tour.testsCaption': 'Тесты на тревогу и симптомы РПП.',
    'tour.next': 'Далее',
    'tour.finish': 'Завершить обзор',

    'techniques.folderTechniques': 'Техники',
    'techniques.folderScreening': 'Скрининг',
    'techniques.folderPsychoeducation': 'Психообразование',
    'techniques.psychoTabBrain': 'Мозг',
    'techniques.psychoTabEdModel': 'Модель ED',
    'techniques.goal': 'Цель',
    'techniques.description': 'Описание',
    'techniques.questions': 'Вопросы',
    'techniques.close': 'Закрыть',

    'tests.heading': 'Тесты',
    'tests.comingSoon': 'Раздел в разработке.',
    'tests.intro': 'Полные психометрические тесты с реальным подсчётом баллов, которые можно пройти вместе с клиентом или предложить ему заранее.',
    'tests.start': 'Пройти тест',
    'tests.next': 'Далее',
    'tests.back': 'Назад',
    'tests.questionOf': 'Вопрос {n} из {m}',
    'tests.calculate': 'Посчитать результат',
    'tests.retake': 'Пройти заново',
    'tests.results': 'Результаты',

    'brain.normal': 'В норме',
    'brain.starvation': 'При голодании',
    'brain.ed': 'При РПП',
    'brain.sources': 'Источники',

    'loading.avatar': 'Собираем аватар…',
    'loading.brain': 'Загружаем модель мозга…',

    'body.heading': 'Тело',
    'body.weight': 'Вес',
    'body.belly': 'Живот',
    'body.waist': 'Талия',
    'body.breast': 'Грудь',
    'body.butt': 'Попа',
    'body.arms': 'Руки',
    'body.legs': 'Бёдра/ноги',
    'body.face': 'Лицо',

    'hair.heading': 'Причёска',
    'hair.none': 'Нет',
    'hair.long': 'Длинные',
    'hair.medium': 'Средние',
    'hair.short': 'Короткие',

    'gaze.heading': 'Айтрекинг (прототип)',
    'gaze.note': 'Требует веб-камеру. Всё считается локально в браузере, видео никуда не отправляется.',
    'gaze.start': 'Начать калибровку',
    'gaze.connecting': 'Запрашиваю доступ к камере…',
    'gaze.stop': 'Остановить',
    'gaze.show': 'Показать карту',
    'gaze.hide': 'Скрыть карту',
    'gaze.clear': 'Очистить карту',
    'gaze.recalibrate': 'Перекалибровать',
    'gaze.denied': 'Не удалось получить доступ к камере.',

    'calibration.hint': 'Смотрите на точку и кликните по ней {n} раз. Так же для остальных {m}.',
    'calibration.done': 'Готово…',
    'calibration.pointLabel': 'Точка калибровки {i}',

    'avatarConsent.title': 'Перед тем как продолжить',
    'avatarConsent.text': 'Этот раздел предназначен для лицензированных специалистов, работающих с расстройствами пищевого поведения. Переходя дальше, вы подтверждаете, что являетесь таким специалистом и не имеете претензий к InnerSpace.ED.',
    'avatarConsent.remember': 'Подтверждаю и не спрашивайте меня об этом снова',
    'avatarConsent.confirm': 'Подтверждаю',
  },
  en: {
    'app.subtitle': 'Body visualization for therapeutic work',

    'nav.home': 'Home',
    'nav.avatar': 'Avatar',
    'nav.materials': 'Materials',
    'nav.tests': 'Tests',

    'landing.eyebrow': 'Part of the InnerSpace ecosystem',
    'landing.lead':
      'A tool created by clinical psychologists for therapeutic work on body image in eating disorders.',
    'landing.cta': 'Explore the site',
    'landing.disclaimer':
      'This tool is meant to be used together with a professional, not for unsupervised self-guided use.',
    'landing.disclaimerPrivacy':
      'InnerSpace.ED does not collect or store data, and is not responsible for sessions that specialists conduct using this tool.',
    'landing.modelCredit':
      'Bathroom scale, Kettlebell and Dumbbell models by Poly by Google, Salad Bowl by Jarlan Perez, licensed CC BY.',

    'tour.avatarCaption': 'A place to work with body image through a virtual avatar.',
    'tour.materialsCaption': 'Exercises, screenings and psychoeducation.',
    'tour.testsCaption': 'Tests for anxiety and ED symptoms.',
    'tour.next': 'Next',
    'tour.finish': 'Finish the tour',

    'techniques.folderTechniques': 'Techniques',
    'techniques.folderScreening': 'Screening',
    'techniques.folderPsychoeducation': 'Psychoeducation',
    'techniques.psychoTabBrain': 'Brain',
    'techniques.psychoTabEdModel': 'ED model',
    'techniques.goal': 'Goal',
    'techniques.description': 'Description',
    'techniques.questions': 'Questions',
    'techniques.close': 'Close',

    'tests.heading': 'Tests',
    'tests.comingSoon': 'This section is under construction.',
    'tests.intro': 'Full psychometric tests with real scoring, ready to take together with a client or hand to them in advance.',
    'tests.start': 'Take the test',
    'tests.next': 'Next',
    'tests.back': 'Back',
    'tests.questionOf': 'Question {n} of {m}',
    'tests.calculate': 'Calculate result',
    'tests.retake': 'Retake',
    'tests.results': 'Results',

    'brain.normal': 'Normally',
    'brain.starvation': 'During starvation',
    'brain.ed': 'In eating disorders',
    'brain.sources': 'Sources',

    'loading.avatar': 'Building avatar…',
    'loading.brain': 'Loading brain model…',

    'body.heading': 'Body',
    'body.weight': 'Weight',
    'body.belly': 'Belly',
    'body.waist': 'Waist',
    'body.breast': 'Breast',
    'body.butt': 'Butt',
    'body.arms': 'Arms',
    'body.legs': 'Hips/legs',
    'body.face': 'Face',

    'hair.heading': 'Hair',
    'hair.none': 'None',
    'hair.long': 'Long',
    'hair.medium': 'Medium',
    'hair.short': 'Short',

    'gaze.heading': 'Eye tracking (prototype)',
    'gaze.note': 'Requires a webcam. Everything is computed locally in the browser, video is never sent anywhere.',
    'gaze.start': 'Start calibration',
    'gaze.connecting': 'Requesting camera access…',
    'gaze.stop': 'Stop',
    'gaze.show': 'Show map',
    'gaze.hide': 'Hide map',
    'gaze.clear': 'Clear map',
    'gaze.recalibrate': 'Recalibrate',
    'gaze.denied': 'Could not access the camera.',

    'calibration.hint': 'Look at the dot and click it {n} times. Same for the other {m}.',
    'calibration.done': 'Done…',
    'calibration.pointLabel': 'Calibration point {i}',

    'avatarConsent.title': 'Before you continue',
    'avatarConsent.text': 'This section is meant for licensed specialists working with eating disorders. By continuing, you confirm that you are such a specialist and have no claims against InnerSpace.ED.',
    'avatarConsent.remember': "I confirm, and don't ask me again",
    'avatarConsent.confirm': 'Confirm',
  },
};
