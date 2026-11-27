// Original IELTS-style practice questions written for EXPERT IELTS.
// They are labelled PRACTICE — none of them is claimed to have appeared in a real IELTS exam.
// Verified reported questions are added by the owner in the admin panel with a source note.

export const writingTask1 = [
  {
    category: "LINE_GRAPH",
    topic: "Transport",
    prompt:
      "The graph below shows the number of passengers using three types of public transport in a European city between 2000 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      type: "line",
      title: "Daily passengers in a European city (thousands)",
      unit: "thousand passengers",
      categories: ["2000", "2005", "2010", "2015", "2020"],
      series: [
        { name: "Bus", values: [420, 390, 350, 310, 280] },
        { name: "Metro", values: [260, 330, 410, 480, 520] },
        { name: "Tram", values: [90, 95, 120, 170, 210] },
      ],
    },
  },
  {
    category: "BAR_CHART",
    topic: "Education",
    prompt:
      "The chart below shows the percentage of adults who took part in some form of further education in five countries in 2010 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      type: "bar",
      title: "Adults in further education (%)",
      unit: "%",
      categories: ["Finland", "Germany", "Japan", "Brazil", "Egypt"],
      series: [
        { name: "2010", values: [48, 37, 31, 18, 9] },
        { name: "2020", values: [56, 42, 35, 27, 15] },
      ],
    },
  },
  {
    category: "PIE_CHART",
    topic: "Energy",
    prompt:
      "The pie charts below show the sources of electricity generated in one country in 1995 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      type: "pie",
      title: "Electricity sources",
      unit: "%",
      categories: ["Coal", "Natural gas", "Nuclear", "Hydro", "Wind & solar"],
      series: [
        { name: "1995", values: [52, 21, 17, 9, 1] },
        { name: "2020", values: [18, 34, 15, 11, 22] },
      ],
    },
  },
  {
    category: "TABLE",
    topic: "Consumer spending",
    prompt:
      "The table below shows the average weekly household spending on four categories in three cities in 2022.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      type: "table",
      title: "Average weekly household spending (USD), 2022",
      columns: ["City", "Housing", "Food", "Transport", "Leisure"],
      rows: [
        ["Toronto", "410", "165", "95", "120"],
        ["Madrid", "290", "140", "60", "135"],
        ["Seoul", "350", "155", "55", "90"],
      ],
    },
  },
  {
    category: "PROCESS",
    topic: "Manufacturing",
    prompt:
      "The diagram below shows how recycled glass bottles are turned into new glass products.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      type: "process",
      title: "Recycling glass bottles",
      steps: [
        "Used bottles collected from recycling banks",
        "Transported to a sorting plant",
        "Sorted by colour (clear, green, brown)",
        "Washed to remove labels and dirt",
        "Crushed into small pieces called cullet",
        "Mixed with sand, soda ash and limestone",
        "Melted in a furnace at about 1,500°C",
        "Moulded into new bottles and jars",
        "Delivered to shops and filled",
      ],
    },
  },
  {
    category: "MAP",
    topic: "Urban development",
    prompt:
      "The maps below show the centre of a small coastal town in 2000 and today.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      type: "map",
      title: "Town centre",
      panels: [
        {
          label: "2000",
          features: [
            { name: "Fishing harbour", x: 0, y: 0, w: 4, h: 2, kind: "water" },
            { name: "Fish market", x: 4, y: 0, w: 2, h: 2, kind: "building" },
            { name: "Car park", x: 0, y: 2, w: 3, h: 2, kind: "road" },
            { name: "Houses", x: 3, y: 2, w: 3, h: 2, kind: "building" },
            { name: "Farmland", x: 0, y: 4, w: 6, h: 2, kind: "green" },
          ],
        },
        {
          label: "Today",
          features: [
            { name: "Marina", x: 0, y: 0, w: 4, h: 2, kind: "water" },
            { name: "Restaurants", x: 4, y: 0, w: 2, h: 2, kind: "building" },
            { name: "Pedestrian square", x: 0, y: 2, w: 3, h: 2, kind: "green" },
            { name: "Hotel", x: 3, y: 2, w: 3, h: 2, kind: "building" },
            { name: "Housing estate", x: 0, y: 4, w: 4, h: 2, kind: "building" },
            { name: "Park", x: 4, y: 4, w: 2, h: 2, kind: "green" },
          ],
        },
      ],
    },
  },
  {
    category: "MIXED",
    topic: "Tourism",
    prompt:
      "The bar chart shows the number of international visitors to a country from 2016 to 2021, and the table shows how much they spent on average per visit.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      type: "mixed",
      parts: [
        {
          type: "bar",
          title: "International visitors (millions)",
          unit: "million",
          categories: ["2016", "2017", "2018", "2019", "2020", "2021"],
          series: [{ name: "Visitors", values: [8.2, 9.1, 9.8, 10.4, 2.6, 4.9] }],
        },
        {
          type: "table",
          title: "Average spending per visit (USD)",
          columns: ["Year", "Accommodation", "Food", "Shopping"],
          rows: [
            ["2016", "420", "180", "150"],
            ["2019", "470", "210", "190"],
            ["2021", "530", "230", "120"],
          ],
        },
      ],
    },
  },
  {
    category: "LINE_GRAPH",
    topic: "Environment",
    prompt:
      "The graph below shows the average amount of household waste recycled per person in four countries from 2005 to 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      type: "line",
      title: "Household waste recycled per person (kg per year)",
      unit: "kg",
      categories: ["2005", "2010", "2015", "2020"],
      series: [
        { name: "Country A", values: [110, 160, 210, 250] },
        { name: "Country B", values: [190, 200, 205, 210] },
        { name: "Country C", values: [40, 70, 130, 180] },
        { name: "Country D", values: [150, 120, 115, 140] },
      ],
    },
  },
];

export const writingTask2 = [
  { category: "OPINION", topic: "Technology", prompt: "Some people believe that the increasing use of artificial intelligence in the workplace will do more harm than good.\n\nTo what extent do you agree or disagree?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "OPINION", topic: "Education", prompt: "Universities should accept equal numbers of male and female students in every subject.\n\nTo what extent do you agree or disagree?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "DISCUSSION", topic: "Work", prompt: "Some people think that employees should be allowed to work from home, while others believe that working in an office is more productive.\n\nDiscuss both these views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "DISCUSSION", topic: "Crime", prompt: "Some people believe that the best way to reduce crime is to give longer prison sentences. Others think there are better alternative ways of reducing crime.\n\nDiscuss both views and give your opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "ADV_DISADV", topic: "Society", prompt: "In many countries, people are now living longer than ever before.\n\nDo the advantages of this development outweigh the disadvantages?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "ADV_DISADV", topic: "Tourism", prompt: "International tourism has grown rapidly in recent decades, bringing large numbers of visitors to historic cities.\n\nWhat are the advantages and disadvantages of this trend for local residents?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "PROBLEM_SOLUTION", topic: "Health", prompt: "In many parts of the world, children are becoming less physically active than in the past.\n\nWhat are the causes of this problem, and what measures could be taken to solve it?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "PROBLEM_SOLUTION", topic: "Environment", prompt: "Plastic waste is causing serious damage to oceans and marine life.\n\nWhat are the main causes of this problem? What solutions can you suggest?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "DIRECT", topic: "Media", prompt: "Many people now get their news from social media rather than from newspapers or television.\n\nWhy is this happening? Is this a positive or negative development?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "TWO_PART", topic: "Family", prompt: "In some countries, young adults continue to live with their parents until they get married.\n\nWhy do they choose to do this? What effects does this have on the young adults and on their families?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "OPINION", topic: "Government", prompt: "Governments should spend more money on public transport than on building new roads.\n\nTo what extent do you agree or disagree?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
  { category: "TWO_PART", topic: "Language", prompt: "Many minority languages around the world are disappearing.\n\nWhy is this happening? Should governments try to preserve these languages?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words." },
];

export const speakingPart1 = [
  { topic: "Work or studies", title: "Work or studies", questions: ["Do you work or are you a student?", "What do you like most about your job or studies?", "Is there anything you would like to change about it?", "Do you think you will do the same kind of work or study in the future?"] },
  { topic: "Hometown", title: "Your hometown", questions: ["Where is your hometown?", "What do you like about living there?", "Has your hometown changed much in recent years?", "Would you recommend it to visitors? Why?"] },
  { topic: "Daily routine", title: "Daily routine", questions: ["What is your typical morning like?", "Do you prefer to do the same things every day or to have variety?", "Which part of the day do you enjoy most?", "Has your routine changed since you were a child?"] },
  { topic: "Music", title: "Music", questions: ["What kind of music do you listen to?", "Did you learn to play an instrument as a child?", "Do you prefer listening to music alone or with other people?", "Is traditional music popular in your country?"] },
  { topic: "Weather", title: "Weather", questions: ["What's the weather usually like where you live?", "What is your favourite kind of weather?", "Does the weather affect your mood?", "Would you like to live somewhere with a different climate?"] },
  { topic: "Mobile phones", title: "Mobile phones", questions: ["How often do you use your phone?", "What do you mostly use it for?", "Do you think you spend too much time on it?", "How would your life be different without a mobile phone?"] },
];

export const speakingPart2and3 = [
  {
    topic: "People",
    title: "A person who taught you something important",
    cueCard: "Describe a person who taught you something important.",
    bulletPoints: ["who this person is", "what they taught you", "how they taught it to you", "and explain why it was important to you."],
    part3: ["What qualities make someone a good teacher?", "Do you think people learn more from teachers or from their own experience?", "How has the role of teachers changed with technology?", "Should older people continue learning new skills? Why?"],
  },
  {
    topic: "Places",
    title: "A quiet place you like to go",
    cueCard: "Describe a quiet place you like to go to.",
    bulletPoints: ["where it is", "how often you go there", "what you do there", "and explain why you like this place."],
    part3: ["Why do some people prefer quiet places?", "Is it harder to find quiet places in cities nowadays?", "How can city planners create more peaceful public spaces?", "Do you think young people value peace and quiet less than older people?"],
  },
  {
    topic: "Objects",
    title: "A useful piece of technology",
    cueCard: "Describe a piece of technology (not a phone) that you find useful.",
    bulletPoints: ["what it is", "when you got it", "how you use it", "and explain why it is useful to you."],
    part3: ["How has technology changed the way people work?", "Are there any disadvantages of relying on technology?", "Should children be taught to use technology at school from an early age?", "What technology do you think will be important in the future?"],
  },
  {
    topic: "Events",
    title: "A celebration you enjoyed",
    cueCard: "Describe a celebration or special event you enjoyed.",
    bulletPoints: ["what it was", "when and where it took place", "who was there", "and explain why you enjoyed it."],
    part3: ["Why are celebrations important in people's lives?", "How have family celebrations changed in your country?", "Do you think big public celebrations are a waste of money?", "Should traditional festivals be protected?"],
  },
  {
    topic: "Experiences",
    title: "A time you had to wait for something",
    cueCard: "Describe a time when you had to wait for something.",
    bulletPoints: ["what you waited for", "how long you waited", "how you felt while waiting", "and explain what happened in the end."],
    part3: ["Are people less patient today than in the past?", "In what situations is it important to be patient?", "How can businesses reduce waiting times for customers?", "Is patience something that can be learned?"],
  },
  {
    topic: "Activities",
    title: "A skill you would like to learn",
    cueCard: "Describe a skill you would like to learn in the future.",
    bulletPoints: ["what the skill is", "why you want to learn it", "how you would learn it", "and explain how it would help you."],
    part3: ["What skills are most valuable for young people today?", "Is it better to learn skills online or in person?", "Should schools focus more on practical skills?", "Why do some adults stop learning new things?"],
  },
];
