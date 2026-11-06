/* gradebook/gb-core.js — The standards catalog, the gradebook's state and how it is saved, shared helpers, and the shell (tabs, subject switch, routing).
   One of the gradebook's scripts, loaded in order by index.html as classic
   scripts sharing one global scope; see HANDOFF "The gradebook's files". */
/* ============================================================
   STANDARDS CATALOG
   Math: 2021 Oregon Mathematics Standards, Grade 2 (ODE v5.2.10)
   ELA:  2019 Oregon English Language Arts and Literacy Standards, Grade 2
   lvl 1 = parent standard (on by default), lvl 2 = sub-standard (optional)
   ============================================================ */
const CATALOG = [
/* ---------------- MATH ---------------- */
{c:"2.OA.A.1",s:"Math",d:"Operations",lvl:1,lbl:"Add/subtract word problems to 100",t:"Use addition and subtraction within 100 to solve one- and two-step problems in authentic contexts by using drawings and equations with a symbol for the unknown."},
{c:"2.OA.B.2",s:"Math",d:"Operations",lvl:1,lbl:"Fluency within 20",t:"Fluently add and subtract within 20 using accurate, efficient, and flexible strategies and algorithms based on place value and properties of operations."},
/* his split, not Oregon's. 2.OA.B.2 is one standard in the 2021 Oregon
   standards; he marks adding and subtracting apart. Both count toward
   2.OA.B.2 on the report card (rcParent), which stays the Synergy row.
   not any more. He grades them apart in Synergy too, so each half is
   its own report card line (RC_OWN_LINE).
   `shown`: listed in Setup like a main standard, sub-standards on or off. */
{c:"2.OA.B.2a",s:"Math",d:"Operations",lvl:2,shown:1,lbl:"Add fluently within 20",t:"Fluently add within 20 using accurate, efficient, and flexible strategies and algorithms based on place value and properties of operations."},
{c:"2.OA.B.2b",s:"Math",d:"Operations",lvl:2,shown:1,lbl:"Subtract fluently within 20",t:"Fluently subtract within 20 using accurate, efficient, and flexible strategies and algorithms based on place value and properties of operations."},
{c:"2.OA.C.3",s:"Math",d:"Operations",lvl:1,lbl:"Odd and even",t:"Determine whether a group up to 20 objects has an odd or even number by pairing objects or counting them by 2s; record using drawings and equations including expressing an even number as a sum of two equal addends."},
{c:"2.OA.C.4",s:"Math",d:"Operations",lvl:1,lbl:"Arrays as repeated addition",t:"Use addition to find the total number of objects arranged in rectangular arrays with up to 5 rows and up to 5 columns; write an equation to express the total as a sum of equal addends."},

{c:"2.NBT.A.1",s:"Math",d:"Base Ten",lvl:1,lbl:"Hundreds, tens, ones",t:"Understand 100 as a bundle of ten tens and that the three digits of a three-digit number represent amounts of hundreds, tens, and ones."},
{c:"2.NBT.A.2",s:"Math",d:"Base Ten",lvl:1,lbl:"Count and skip-count to 1000",t:"Count within 1000; skip-count by 5's, 10's, and 100's."},
{c:"2.NBT.A.3",s:"Math",d:"Base Ten",lvl:1,lbl:"Read/write numbers to 1000",t:"Read and write numbers to 1000 using base-ten numerals, number names, and expanded form."},
{c:"2.NBT.A.4",s:"Math",d:"Base Ten",lvl:1,lbl:"Compare 3-digit numbers",t:"Compare two three-digit numbers based on meanings of the hundreds, tens, and ones digits, using >, =, and < symbols to record the results of comparisons."},
{c:"2.NBT.B.5",s:"Math",d:"Base Ten",lvl:1,lbl:"Fluency within 100",t:"Fluently add and subtract within 100 using accurate, efficient, and flexible strategies based on place value, properties of operations, and/or the relationship between addition and subtraction."},
{c:"2.NBT.B.6",s:"Math",d:"Base Ten",lvl:1,lbl:"Add four 2-digit numbers",t:"Add up to four two-digit numbers using strategies based on place value and properties of operations and describe how two different strategies result in the same sum."},
{c:"2.NBT.B.7",s:"Math",d:"Base Ten",lvl:1,lbl:"Add/subtract within 1000",t:"Add and subtract within 1000 using concrete or visual representations and strategies based on place value, properties of operations, and/or the relationship between addition and subtraction. Relate the strategy to a written method and explain why sometimes it is necessary to compose or decompose tens or hundreds."},
{c:"2.NBT.B.8",s:"Math",d:"Base Ten",lvl:1,lbl:"Mentally 10/100 more or less",t:"Without having to count, mentally find 10 more or 10 less and 100 more or 100 less than a given three-digit number."},
{c:"2.NBT.B.9",s:"Math",d:"Base Ten",lvl:1,lbl:"Explain why strategies work",t:"Explain why strategies to add and subtract work using properties of operations and the relationship between addition and subtraction."},

{c:"2.GM.A.1",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Shapes and attributes",t:"Recognize and draw shapes having specified attributes, such as a given number of angles or a given number of equal faces."},
{c:"2.GM.A.2",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Partition rectangles into squares",t:"Partition a rectangle into rows and columns of same-size squares and count to find the total number of them."},
{c:"2.GM.A.3",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Equal parts of shapes",t:"Partition circles and rectangles into two, three, or four equal parts. Recognize that equal parts of identical wholes need not have the same shape."},
{c:"2.GM.B.4",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Measure with the right tool",t:"Measure the length of an object by selecting and using appropriate measurement tools."},
{c:"2.GM.B.5",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Measure in two units",t:"Measure the length of an object using two different length units and describe how the measurements relate to the size of the unit chosen."},
{c:"2.GM.B.6",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Estimate lengths",t:"Estimate lengths using units of inches, feet, yards, centimeters, and meters."},
{c:"2.GM.B.7",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Compare two lengths",t:"Measure two objects and determine the difference in their lengths in terms of a standard length unit."},
{c:"2.GM.C.8",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Length word problems",t:"Use addition and subtraction within 100 to solve problems in authentic contexts involving lengths that are given in the same units."},
{c:"2.GM.C.9",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Number line sums/differences",t:"Represent whole number lengths on a number line diagram; use number lines to find sums and differences within 100."},
{c:"2.GM.D.10",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Time to five minutes",t:"Tell and write time from analog and digital clocks to the nearest five minutes, using a.m. and p.m."},
{c:"2.GM.D.11",s:"Math",d:"Geometry & Measurement",lvl:1,lbl:"Money problems",t:"Solve problems in authentic contexts involving dollar bills, quarters, dimes, nickels, and pennies, using $ and \u00a2 symbols appropriately."},

{c:"2.DR.A.1",s:"Math",d:"Data Reasoning",lvl:1,lbl:"Pose questions, collect data",t:"Generate questions to investigate situations within the classroom. Collect or consider data that can naturally answer questions by using measurements with whole-number units."},
{c:"2.DR.B.2",s:"Math",d:"Data Reasoning",lvl:1,lbl:"Interpret data",t:"Analyze data with a single-unit scale and interpret information presented to answer investigative questions."},

/* ---------------- ELA: Reading Foundational ---------------- */
{c:"2.RF.2",s:"ELA",d:"Foundational Skills",lvl:1,lbl:"Phonological awareness",t:"Demonstrate command of spoken words in familiar two- and three-syllable words."},
{c:"2.RF.2a",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Substitute medial vowels",t:"Substitute medial vowels in one-syllable words."},
{c:"2.RF.2b",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Blends in final position",t:"Substitute and delete parts of blends in the final position in one-syllable words."},
{c:"2.RF.3",s:"ELA",d:"Foundational Skills",lvl:1,lbl:"Phonics and word analysis",t:"Know and apply grade-level phonics and word analysis skills in decoding words."},
{c:"2.RF.3a",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Long vs. short vowels",t:"Distinguish long and short vowels when reading regularly spelled one-syllable words."},
{c:"2.RF.3b",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Vowel teams",t:"Know spelling-sound correspondences for additional common vowel teams."},
{c:"2.RF.3c",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Two-syllable long vowels",t:"Decode regularly spelled two-syllable words with long vowels."},
{c:"2.RF.3d",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Prefixes and suffixes",t:"Decode words with grade-appropriate prefixes and suffixes."},
{c:"2.RF.3e",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Inconsistent spellings",t:"Identify words with inconsistent but common spelling-sound correspondences."},
{c:"2.RF.3f",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Irregularly spelled words",t:"Recognize and read grade-appropriate irregularly spelled words."},
{c:"2.RF.4",s:"ELA",d:"Foundational Skills",lvl:1,lbl:"Fluency",t:"Read with sufficient accuracy and fluency to support comprehension."},
{c:"2.RF.4a",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Read with purpose",t:"Read grade-level text with purpose and understanding."},
{c:"2.RF.4b",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Accuracy, rate, expression",t:"Read grade-level text orally with accuracy, appropriate rate, and expression on successive readings."},
{c:"2.RF.4c",s:"ELA",d:"Foundational Skills",lvl:2,lbl:"Self-correct",t:"Use context to confirm or self-correct word recognition and understanding, rereading as necessary."},

/* ---------------- ELA: Literature ---------------- */
{c:"2.RL.1",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Ask and answer questions",t:"Ask and answer such questions as who, what, where, when, why, and how to demonstrate understanding of key details in a text."},
{c:"2.RL.2",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Recount and find the lesson",t:"Recount stories, including fables and folktales from diverse cultures, and determine their central message, lesson, or moral."},
{c:"2.RL.3",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Characters and problem",t:"Describe how characters in a story respond to major events and challenges, including identifying the characters' feelings, the plot or problem, and how it is resolved."},
{c:"2.RL.4",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Rhythm and word meaning",t:"Describe how words and phrases supply rhythm and meaning in a story, poem, or song."},
{c:"2.RL.5",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Story structure",t:"Describe the overall structure of a story, including describing how the beginning introduces the story, how the middle progresses the action, and the ending concludes the action."},
{c:"2.RL.6",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Points of view",t:"Acknowledge differences in the points of view of characters, including by speaking in a different voice for each character when reading dialogue aloud."},
{c:"2.RL.7",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Illustrations and words",t:"Use information gained from the illustrations and words in a print or digital text to demonstrate understanding of its characters, setting, or plot."},
{c:"2.RL.9",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Compare story versions",t:"Compare and contrast two or more versions of the same story by different authors or from different cultures."},
{c:"2.RL.10",s:"ELA",d:"Reading Literature",lvl:1,lbl:"Grade 2\u20133 literature",t:"By the end of the year, read and comprehend literature, including stories and poetry, in the grades 2\u20133 text complexity band proficiently, with scaffolding as needed at the high end of the range."},

/* ---------------- ELA: Informational ---------------- */
{c:"2.RI.1",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Ask and answer questions",t:"Ask and answer such questions as who, what, where, when, why, and how to demonstrate understanding of key details in a text."},
{c:"2.RI.2",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Main topic",t:"Identify the main topic of a multi-paragraph text as well as the focus of specific paragraphs within the text."},
{c:"2.RI.3",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Connections in a text",t:"Describe the connection between a series of historical events, scientific ideas or concepts, or steps in technical procedures in a text."},
{c:"2.RI.4",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Word meaning",t:"Determine the meaning of words and phrases in a text relevant to a grade 2 topic or subject area."},
{c:"2.RI.5",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Text features",t:"Know and use various text features to locate key facts or information in a text efficiently."},
{c:"2.RI.6",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Author's purpose",t:"Identify the main purpose of a text, including what the author wants to answer, explain, or describe."},
{c:"2.RI.7",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Images clarify text",t:"Explain how specific images contribute to and clarify a text."},
{c:"2.RI.8",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Reasons support points",t:"Describe how reasons support specific points the author makes in a text."},
{c:"2.RI.9",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Compare two texts",t:"Compare and contrast the most important points presented by two texts on the same topic."},
{c:"2.RI.10",s:"ELA",d:"Reading Informational",lvl:1,lbl:"Grade 2\u20133 informational",t:"By the end of year, read and comprehend informational texts, including history/social studies, science, and technical texts, in the grades 2\u20133 text complexity band proficiently, with scaffolding as needed at the high end of the range."},

/* ---------------- ELA: Writing ---------------- */
{c:"2.W.1",s:"ELA",d:"Writing",lvl:1,lbl:"Opinion writing",t:"Write opinion pieces in which they introduce the topic or book they are writing about, state an opinion, supply reasons that support the opinion, use linking words to connect opinion and reasons, and provide a concluding statement or section."},
{c:"2.W.2",s:"ELA",d:"Writing",lvl:1,lbl:"Informative writing",t:"Write multi-paragraph informative/explanatory texts to examine a topic and convey ideas and information clearly."},
{c:"2.W.2a",s:"ELA",d:"Writing",lvl:2,lbl:"Introduce and group info",t:"Introduce a topic and group related information together; include illustrations when useful in aiding comprehension."},
{c:"2.W.2b",s:"ELA",d:"Writing",lvl:2,lbl:"Facts and details",t:"Develop the topic with facts, definitions, and details."},
{c:"2.W.2c",s:"ELA",d:"Writing",lvl:2,lbl:"Linking words",t:"Use linking words and phrases to connect ideas within categories of information."},
{c:"2.W.3",s:"ELA",d:"Writing",lvl:1,lbl:"Narrative writing",t:"Write narratives to develop real or imagined experiences or events using effective technique, descriptive details, and clear event sequences."},
{c:"2.W.3a",s:"ELA",d:"Writing",lvl:2,lbl:"Situation and characters",t:"Establish a situation and introduce a narrator and/or characters; organize an event sequence that unfolds naturally."},
{c:"2.W.3b",s:"ELA",d:"Writing",lvl:2,lbl:"Dialogue and description",t:"Use dialogue and descriptions of actions, thoughts, and feelings to develop experiences and events or show the response of characters to situations."},
{c:"2.W.3c",s:"ELA",d:"Writing",lvl:2,lbl:"Temporal words",t:"Use temporal words and phrases to signal event order."},
{c:"2.W.3d",s:"ELA",d:"Writing",lvl:2,lbl:"Sense of closure",t:"Provide a sense of closure."},
{c:"2.W.5",s:"ELA",d:"Writing",lvl:1,lbl:"Revise and edit",t:"With guidance and support, focus on a topic and strengthen writing as needed by revising and editing."},
{c:"2.W.6",s:"ELA",d:"Writing",lvl:1,lbl:"Publish with technology",t:"With guidance and support, use technology to produce and publish writing as well as to interact and collaborate with others."},
{c:"2.W.7",s:"ELA",d:"Writing",lvl:1,lbl:"Shared research",t:"Participate in shared research and writing projects."},
{c:"2.W.8",s:"ELA",d:"Writing",lvl:1,lbl:"Gather information",t:"Recall information from experiences or gather information from provided sources to answer a question."},

/* ---------------- ELA: Language ---------------- */
{c:"2.L.1",s:"ELA",d:"Language",lvl:1,lbl:"Grammar and usage",t:"Demonstrate command of the conventions of standard English grammar and usage when writing or speaking."},
{c:"2.L.1a",s:"ELA",d:"Language",lvl:2,lbl:"Collective nouns",t:"Use collective nouns."},
{c:"2.L.1b",s:"ELA",d:"Language",lvl:2,lbl:"Irregular plural nouns",t:"Form and use frequently occurring irregular plural nouns."},
{c:"2.L.1c",s:"ELA",d:"Language",lvl:2,lbl:"Reflexive pronouns",t:"Use reflexive pronouns."},
{c:"2.L.1d",s:"ELA",d:"Language",lvl:2,lbl:"Irregular past tense",t:"Form and use the past tense of frequently occurring irregular verbs."},
{c:"2.L.1e",s:"ELA",d:"Language",lvl:2,lbl:"Adjectives and adverbs",t:"Use adjectives and adverbs, and choose between them depending on what is to be modified."},
{c:"2.L.1f",s:"ELA",d:"Language",lvl:2,lbl:"Simple and compound sentences",t:"Produce, expand, and rearrange complete simple and compound sentences."},
{c:"2.L.2",s:"ELA",d:"Language",lvl:1,lbl:"Capitals, punctuation, spelling",t:"Demonstrate command of the conventions of standard English capitalization, punctuation, and spelling when writing."},
{c:"2.L.2a",s:"ELA",d:"Language",lvl:2,lbl:"Capitalize proper nouns",t:"Capitalize holidays, product names, and geographic names."},
{c:"2.L.2b",s:"ELA",d:"Language",lvl:2,lbl:"Commas in letters",t:"Use commas in greetings and closings of letters."},
{c:"2.L.2c",s:"ELA",d:"Language",lvl:2,lbl:"Apostrophes",t:"Use an apostrophe to form contractions and frequently occurring possessives."},
{c:"2.L.2d",s:"ELA",d:"Language",lvl:2,lbl:"Spelling patterns",t:"Generalize learned spelling patterns when writing words."},
{c:"2.L.2e",s:"ELA",d:"Language",lvl:2,lbl:"Use reference materials",t:"Consult reference materials, including beginning dictionaries, both print and digital, as needed to check and correct spellings."},
{c:"2.L.3",s:"ELA",d:"Language",lvl:1,lbl:"Knowledge of language",t:"Use knowledge of language and its conventions when writing, speaking, reading, or listening."},
{c:"2.L.3a",s:"ELA",d:"Language",lvl:2,lbl:"Formal and informal English",t:"Compare formal and informal uses of English."},
{c:"2.L.4",s:"ELA",d:"Language",lvl:1,lbl:"Unknown word strategies",t:"Determine or clarify the meaning of unknown and multiple-meaning words and phrases based on grade 2 reading and content, choosing from an array of strategies."},
{c:"2.L.4a",s:"ELA",d:"Language",lvl:2,lbl:"Context clues",t:"Use sentence-level context as a clue to the meaning of a word or phrase."},
{c:"2.L.4b",s:"ELA",d:"Language",lvl:2,lbl:"Prefix meaning",t:"Determine the meaning of the new word formed when a known prefix is added to a known word."},
{c:"2.L.4c",s:"ELA",d:"Language",lvl:2,lbl:"Root words",t:"Use a known root word as a clue to the meaning of an unknown word with the same root."},
{c:"2.L.4d",s:"ELA",d:"Language",lvl:2,lbl:"Compound words",t:"Use knowledge of the meaning of individual words to predict the meaning of compound words."},
{c:"2.L.4e",s:"ELA",d:"Language",lvl:2,lbl:"Glossaries and dictionaries",t:"Use glossaries, beginning dictionaries, and other reference materials, both print and digital, to determine or clarify the meaning of words and phrases."},
{c:"2.L.5",s:"ELA",d:"Language",lvl:1,lbl:"Word relationships",t:"Demonstrate understanding of word relationships and nuances in word meanings."},
{c:"2.L.5a",s:"ELA",d:"Language",lvl:2,lbl:"Real-life connections",t:"Identify real-life connections between words and their use."},
{c:"2.L.5b",s:"ELA",d:"Language",lvl:2,lbl:"Shades of meaning",t:"Distinguish shades of meaning among closely related verbs and closely related adjectives."},
{c:"2.L.6",s:"ELA",d:"Language",lvl:1,lbl:"Use new vocabulary",t:"Use words and phrases acquired through conversations, reading and being read to, and responding to texts, including using adjectives and adverbs to describe."},

/* ---------------- ELA: Speaking & Listening ---------------- */
{c:"2.SL.1",s:"ELA",d:"Speaking & Listening",lvl:1,lbl:"Collaborative conversations",t:"Participate in collaborative conversations with diverse partners about grade 2 topics and texts with peers and adults in small and larger groups."},
{c:"2.SL.1a",s:"ELA",d:"Speaking & Listening",lvl:2,lbl:"Follow discussion rules",t:"Follow agreed-upon rules for discussions."},
{c:"2.SL.1b",s:"ELA",d:"Speaking & Listening",lvl:2,lbl:"Build on others' talk",t:"Build on others' talk in conversations by linking their comments to the remarks of others."},
{c:"2.SL.1c",s:"ELA",d:"Speaking & Listening",lvl:2,lbl:"Ask for clarification",t:"Ask for clarification and further explanation as needed about the topics and texts under discussion."},
{c:"2.SL.2",s:"ELA",d:"Speaking & Listening",lvl:1,lbl:"Recount read-alouds",t:"Recount or describe key ideas or details from a text read aloud or information presented orally or through other media."},
{c:"2.SL.3",s:"ELA",d:"Speaking & Listening",lvl:1,lbl:"Question a speaker",t:"Ask and answer questions about what a speaker says in order to clarify comprehension, gather additional information, or deepen understanding of a topic or issue."},
{c:"2.SL.4",s:"ELA",d:"Speaking & Listening",lvl:1,lbl:"Tell a story audibly",t:"Tell a story or recount an experience with appropriate facts and relevant, descriptive details, speaking audibly in coherent sentences."},
{c:"2.SL.5",s:"ELA",d:"Speaking & Listening",lvl:1,lbl:"Audio and visual displays",t:"Create audio recordings of stories or poems; add drawings or other visual displays to stories or recounts of experiences when appropriate to clarify ideas, thoughts, and feelings."},
{c:"2.SL.6",s:"ELA",d:"Speaking & Listening",lvl:1,lbl:"Complete sentences",t:"Produce complete sentences when appropriate to task and situation in order to provide requested detail or clarification."}
];

/* Report card lines: the spine that goes into Synergy. Edit freely in Setup. */
const DEFAULT_RC = [
 {id:"rc1", s:"Math", n:"Solves addition and subtraction problems", std:["2.OA.A.1","2.GM.C.8"]},
 {id:"rc2", s:"Math", n:"Fluently adds and subtracts within 20", std:["2.OA.B.2"]},
 {id:"rc3", s:"Math", n:"Understands place value to 1000", std:["2.NBT.A.1","2.NBT.A.2","2.NBT.A.3","2.NBT.A.4"]},
 {id:"rc4", s:"Math", n:"Adds and subtracts within 100 and 1000", std:["2.NBT.B.5","2.NBT.B.6","2.NBT.B.7","2.NBT.B.8","2.NBT.B.9"]},
 {id:"rc5", s:"Math", n:"Measures and compares lengths", std:["2.GM.B.4","2.GM.B.5","2.GM.B.6","2.GM.B.7","2.GM.C.9"]},
 {id:"rc6", s:"Math", n:"Tells time and works with money", std:["2.GM.D.10","2.GM.D.11"]},
 {id:"rc7", s:"Math", n:"Reasons with shapes and equal parts", std:["2.GM.A.1","2.GM.A.2","2.GM.A.3","2.OA.C.3","2.OA.C.4"]},
 {id:"rc8", s:"Math", n:"Collects and interprets data", std:["2.DR.A.1","2.DR.B.2"]},
 {id:"rc9", s:"ELA", n:"Applies phonics and word analysis", std:["2.RF.2","2.RF.3"]},
 {id:"rc10", s:"ELA", n:"Reads grade-level text fluently", std:["2.RF.4"]},
 {id:"rc11", s:"ELA", n:"Comprehends literature", std:["2.RL.1","2.RL.2","2.RL.3","2.RL.4","2.RL.5","2.RL.6","2.RL.7","2.RL.9","2.RL.10"]},
 {id:"rc12", s:"ELA", n:"Comprehends informational text", std:["2.RI.1","2.RI.2","2.RI.3","2.RI.4","2.RI.5","2.RI.6","2.RI.7","2.RI.8","2.RI.9","2.RI.10"]},
 {id:"rc13", s:"ELA", n:"Writes opinion pieces", std:["2.W.1"]},
 {id:"rc14", s:"ELA", n:"Writes informative texts", std:["2.W.2"]},
 {id:"rc15", s:"ELA", n:"Writes narratives", std:["2.W.3"]},
 {id:"rc16", s:"ELA", n:"Uses conventions of writing", std:["2.L.1","2.L.2","2.W.5"]},
 {id:"rc17", s:"ELA", n:"Builds and uses vocabulary", std:["2.L.3","2.L.4","2.L.5","2.L.6"]},
 {id:"rc18", s:"ELA", n:"Speaks and listens effectively", std:["2.SL.1","2.SL.2","2.SL.3","2.SL.4","2.SL.5","2.SL.6"]}
];

/* each standard in a family's words, for the conference sheet. One
   line per catalog code, sub-standards too (test-conference.js checks every
   code has one). Plain present tense: what the child is working to do. */
const PARENT_WORDS = {
"2.OA.A.1":"Solves story problems with adding and subtracting up to 100",
"2.OA.B.2":"Adds and subtracts within 20 quickly and accurately",
"2.OA.B.2a":"Adds within 20 quickly and accurately",
"2.OA.B.2b":"Subtracts within 20 quickly and accurately",
"2.OA.C.3":"Tells whether a number is odd or even",
"2.OA.C.4":"Uses adding to count objects in rows and columns",
"2.NBT.A.1":"Understands hundreds, tens, and ones",
"2.NBT.A.2":"Counts to 1,000 and skip-counts by 5s, 10s, and 100s",
"2.NBT.A.3":"Reads and writes numbers up to 1,000",
"2.NBT.A.4":"Compares three-digit numbers using >, =, and <",
"2.NBT.B.5":"Adds and subtracts within 100 quickly and accurately",
"2.NBT.B.6":"Adds up to four two-digit numbers",
"2.NBT.B.7":"Adds and subtracts within 1,000 using place value",
"2.NBT.B.8":"Finds 10 or 100 more or less than a number in their head",
"2.NBT.B.9":"Explains why an adding or subtracting strategy works",
"2.GM.A.1":"Names and draws shapes by their sides and corners",
"2.GM.A.2":"Splits a rectangle into rows and columns of equal squares",
"2.GM.A.3":"Divides shapes into halves, thirds, and fourths",
"2.GM.B.4":"Measures length with the right tool",
"2.GM.B.5":"Measures the same object in two different units",
"2.GM.B.6":"Estimates lengths in inches, feet, centimeters, and meters",
"2.GM.B.7":"Measures how much longer one object is than another",
"2.GM.C.8":"Solves story problems about length",
"2.GM.C.9":"Shows adding and subtracting on a number line",
"2.GM.D.10":"Tells time to the nearest five minutes",
"2.GM.D.11":"Solves problems with dollars and coins",
"2.DR.A.1":"Asks questions and collects data to answer them",
"2.DR.B.2":"Reads and explains graphs and charts",
"2.RF.2":"Hears and changes the sounds in words",
"2.RF.2a":"Changes the middle vowel sound to make a new word",
"2.RF.2b":"Hears blends at the end of words",
"2.RF.3":"Uses phonics to read new words",
"2.RF.3a":"Tells long and short vowel sounds apart",
"2.RF.3b":"Reads vowel teams such as ai, ee, and oa",
"2.RF.3c":"Reads two-syllable words with long vowels",
"2.RF.3d":"Reads words with common prefixes and suffixes",
"2.RF.3e":"Reads words whose spelling and sound don't match",
"2.RF.3f":"Reads tricky, irregularly spelled words",
"2.RF.4":"Reads smoothly, accurately, and with understanding",
"2.RF.4a":"Reads to understand, not just to finish",
"2.RF.4b":"Reads accurately, at a good pace, with expression",
"2.RF.4c":"Notices and fixes their own reading mistakes",
"2.RL.1":"Asks and answers who, what, where, when, why, and how about stories",
"2.RL.2":"Retells stories and finds the lesson or message",
"2.RL.3":"Describes how characters handle problems",
"2.RL.4":"Notices rhythm and word choice in stories and poems",
"2.RL.5":"Describes a story's beginning, middle, and end",
"2.RL.6":"Notices different characters' points of view",
"2.RL.7":"Uses pictures and words together to understand a story",
"2.RL.9":"Compares two versions of the same story",
"2.RL.10":"Reads and understands second-grade stories and poems",
"2.RI.1":"Asks and answers questions about nonfiction",
"2.RI.2":"Finds the main topic of a nonfiction text",
"2.RI.3":"Explains how events or steps in a text connect",
"2.RI.4":"Figures out new words in nonfiction",
"2.RI.5":"Uses headings, captions, and other text features",
"2.RI.6":"Tells what the author wants to answer, explain, or describe",
"2.RI.7":"Explains how pictures and diagrams help a text",
"2.RI.8":"Tells how reasons support an author's points",
"2.RI.9":"Compares two texts on the same topic",
"2.RI.10":"Reads and understands second-grade nonfiction",
"2.W.1":"Writes opinion pieces with reasons",
"2.W.2":"Writes to teach about a topic",
"2.W.2a":"Introduces a topic and groups facts together",
"2.W.2b":"Uses facts and details in their writing",
"2.W.2c":"Uses linking words such as also, another, and because",
"2.W.3":"Writes stories about real or imagined events",
"2.W.3a":"Sets up a situation and characters in a story",
"2.W.3b":"Uses dialogue and description in stories",
"2.W.3c":"Uses words like first, next, and later to show order",
"2.W.3d":"Gives a story a clear ending",
"2.W.5":"Revises and edits writing with help",
"2.W.6":"Uses technology to publish writing",
"2.W.7":"Takes part in shared research projects",
"2.W.8":"Gathers information to answer a question",
"2.L.1":"Uses correct grammar when writing and speaking",
"2.L.1a":"Uses group words such as a team or a flock",
"2.L.1b":"Uses irregular plurals such as feet, children, and mice",
"2.L.1c":"Uses words like myself and ourselves",
"2.L.1d":"Uses irregular past tense such as sat, hid, and told",
"2.L.1e":"Uses describing words for nouns and verbs",
"2.L.1f":"Writes simple and compound sentences",
"2.L.2":"Uses capitals, punctuation, and spelling correctly",
"2.L.2a":"Capitalizes names, holidays, and places",
"2.L.2b":"Uses commas in letter greetings and closings",
"2.L.2c":"Uses apostrophes in contractions and to show ownership",
"2.L.2d":"Uses spelling patterns they've learned",
"2.L.2e":"Checks spelling in a dictionary or word list",
"2.L.3":"Chooses words and sentences that fit the purpose",
"2.L.3a":"Tells formal and informal English apart",
"2.L.4":"Figures out the meaning of new words",
"2.L.4a":"Uses the rest of the sentence to work out a word",
"2.L.4b":"Uses prefixes to work out a word's meaning",
"2.L.4c":"Uses a known root word to work out a new word",
"2.L.4d":"Uses the two parts of compound words to work out meaning",
"2.L.4e":"Uses glossaries and dictionaries",
"2.L.5":"Understands how words relate to each other",
"2.L.5a":"Connects words to real life",
"2.L.5b":"Tells apart close words such as toss, throw, and hurl",
"2.L.6":"Uses new vocabulary when talking and writing",
"2.SL.1":"Takes part in class conversations",
"2.SL.1a":"Follows the rules for a good discussion",
"2.SL.1b":"Builds on what others say",
"2.SL.1c":"Asks questions when something isn't clear",
"2.SL.2":"Retells what was read aloud or presented",
"2.SL.3":"Asks and answers questions about what a speaker says",
"2.SL.4":"Tells a story or experience clearly, with details",
"2.SL.5":"Makes recordings or drawings to share stories",
"2.SL.6":"Speaks in complete sentences when needed"
};

/* ============================================================
   STATE
   ============================================================ */
const KEY = "gb2_standards_v1";
/* what was here immediately before the last restore, so a mis-picked
   file is recoverable. Not synced: it is this device's undo, not data. */
const PRE_RESTORE = "gb2:preRestore:v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const byCode = {}; CATALOG.forEach(s => byCode[s.c] = s);
/* Which code a math standard is shown by. The Reveal pacing guide, and so
   the planner, speak CCSS; this catalog is the 2021 Oregon standards, which
   kept the CCSS codes for OA and NBT and renumbered measurement, data and
   geometry (2.MD.A.1 is 2.GM.B.4 here). Marks are always stored under the
   Oregon code, whatever this shows, so switching it moves nothing.
   Oregon is the default because Synergy's report card is Oregon;
   CCSS is an opt-in, so a settings object with no mathCodes reads as
   Oregon. Setup -> "Show math codes as" chooses, and every view that
   names a math standard goes through here. */
function dispCode(c) {
  const s = byCode[c];
  if (!s || s.s !== "Math" || !window.RevealPacing || !(S && S.settings && S.settings.mathCodes === "ccss")) return c;
  return window.RevealPacing.ccssFor(c) || c;
}
function codeHTML(c) {
  const d = dispCode(c);
  return '<code class="std"' + (d !== c ? ' title="Oregon ' + esc(c) + '"' : (byCode[c] && byCode[c].s === "Math" && window.RevealPacing && window.RevealPacing.ccssFor(c) && window.RevealPacing.ccssFor(c) !== c ? ' title="CCSS ' + esc(window.RevealPacing.ccssFor(c)) + '"' : "")) + ">" + esc(d) + "</code>";
}

const QUARTER_NAMES = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4", "Quarter 5", "Quarter 6"];
const TRI_NAMES = ["Trimester 1", "Trimester 2", "Trimester 3"];
const SEM_NAMES = ["Semester 1", "Semester 2"];
function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
function splitYear(start, end, n) {
  const total = Math.max(n, daysBetween(start, end));
  const names = n === 4 ? QUARTER_NAMES : n === 3 ? TRI_NAMES : n === 2 ? SEM_NAMES : QUARTER_NAMES;
  const out = [];
  for (let i = 0; i < n; i++) {
    const s0 = i === 0 ? start : addDays(start, Math.round(total * i / n));
    const e0 = i === n - 1 ? end : addDays(start, Math.round(total * (i + 1) / n) - 1);
    out.push({ id: "t" + (i + 1), name: names[i] || "Term " + (i + 1), start: s0, end: e0 });
  }
  return out;
}

function hydrate(p) {
  const b = blankState();
  const defSettings = b.settings, defTerms = b.terms, defRc = b.rc, defActive = b.active;
  const out = Object.assign(b, p || {});
  out.settings = Object.assign({}, defSettings, (p && p.settings) || {});
  out.settings.orfCuts = Object.assign({ 4: 75, 3: 50, 2: 25 }, out.settings.orfCuts || {});
  /* Creswell scores fluency by fixed WCPM bands, 0-19 a 1, 20-79 a 2,
     80-100 a 3, 101+ a 4. Until now every check was placed on the spring
     percentile norms, so a 41 (below the spring 25th, 72) came out a 1.
     The bands become the rule, once; the norm rules stay a choice. */
  out.settings.orfWcpm = Object.assign({ 2: 20, 3: 80, 4: 101 }, out.settings.orfWcpm || {});
  out.seeded = out.seeded || {};
  if (!out.seeded.orfWcpm) { out.settings.orfAgainst = "wcpm"; out.seeded.orfWcpm = 1; }
  /* on reflection he chose the fall norms, by percentile: a 1 below the
     20th, a 2 to the 75th, a 3 to the 90th, a 4 at the 90th and up. Once. */
  if (!out.seeded.orfFall) { out.settings.orfAgainst = "fall"; out.settings.orfCuts = { 4: 90, 3: 75, 2: 20 }; out.seeded.orfFall = 1; }
  out.settings.orfSeason = Object.assign({ fall: "08-01", winter: "12-01", spring: "03-01" }, out.settings.orfSeason || {});
  out.settings.ireadyCuts = Object.assign({ 4: 1, 3: 0, 2: -1 }, out.settings.ireadyCuts || {});
  if (!Array.isArray(out.students)) out.students = [];
  if (!Array.isArray(out.scores)) out.scores = [];
  if (!Array.isArray(out.iready)) out.iready = [];
  if (!Array.isArray(out.orf)) out.orf = [];
  if (!Array.isArray(out.goals)) out.goals = [];   /* class goals */
  if (!Array.isArray(out.ggroups)) out.ggroups = [];   /* group goals */
  if (!out.ggPlace || typeof out.ggPlace !== "object" || Array.isArray(out.ggPlace)) out.ggPlace = {};
  /* moves made on the suggestion before it is used; the year goals */
  if (!out.ggSugMoves || typeof out.ggSugMoves !== "object" || Array.isArray(out.ggSugMoves)) out.ggSugMoves = {};
  if (!out.yearGoals || typeof out.yearGoals !== "object" || !Array.isArray(out.yearGoals.groups)) out.yearGoals = null;
  if (!Array.isArray(out.missing)) out.missing = [];
  if (!Array.isArray(out.terms) || !out.terms.length) out.terms = defTerms;
  if (!Array.isArray(out.rc)) out.rc = defRc;
  if (!out.active || typeof out.active !== "object") out.active = defActive;
  if (!out.orfLink || typeof out.orfLink !== "object") out.orfLink = {};
  if (!out.unitMap || typeof out.unitMap !== "object") out.unitMap = {};
  if (!out.unitCount || typeof out.unitCount !== "object") out.unitCount = {};
  if (out.sub && typeof out.sub !== "object") out.sub = null;
  if (!out.overrides || typeof out.overrides !== "object") out.overrides = {};
  if (!out.groupPins || typeof out.groupPins !== "object") out.groupPins = {};
  /* pairs the teacher said are two children, "idA|idB" sorted */
  if (!out.notSame || typeof out.notSame !== "object") out.notSame = {};
  if (!out.seeded || typeof out.seeded !== "object") out.seeded = {};
  seedRevealUnits(out);
  seedBenchmarkUnits(out);
  /* report cards are figured by power law over the year so far, iReady
     included, as he asked. Once, and flagged: a later change in Setup stays. */
  if (!out.seeded.rcPowerLaw) {
    out.settings.rule = "powerlaw";
    out.settings.rcYTD = true;
    out.settings.ireadyInReport = true;
    out.seeded.rcPowerLaw = 1;
  }
  /* a standard with no scores takes its mark from iReady alone. On
     once, as he asked; turning it off in Setup stays off. */
  if (!out.seeded.rcIreadyFill) {
    out.settings.rcIreadyFill = true;
    out.seeded.rcIreadyFill = 1;
  }
  splitFluency20(out);
  /* 2.OA.B.2's halves are separate report card lines now. A mark he
     set on the old combined line goes to both halves, once. */
  if (!out.seeded.fl20RcLines) {
    Object.keys(out.overrides || {}).forEach(k => {
      const m = /^(.*\|std:)2\.OA\.B\.2$/.exec(k);
      if (!m) return;
      [FL20_ADD, FL20_SUB].forEach(c => { if (!out.overrides[m[1] + c]) out.overrides[m[1] + c] = out.overrides[k]; });
      delete out.overrides[k];
    });
    out.seeded.fl20RcLines = 1;
  }
  /* a "no work" logged before the assignment got its name kept the old
     name (names only relabelled marks then). Where one name is on that
     standard and date, give the "no work" that name, once. */
  if (!out.seeded.missCtx) {
    (out.missing || []).forEach(m => {
      const names = [...new Set((out.scores || []).filter(x => x.std === m.std && x.date === m.date && !x.source).map(x => x.ctx || ""))];
      if (names.length === 1 && (m.ctx || "") !== names[0]) m.ctx = names[0];
    });
    out.seeded.missCtx = 1;
  }
  return out;
}
/* "Fluency within 20" (2.OA.B.2) became two, adding (2.OA.B.2a) and
   subtracting (2.OA.B.2b). Every mark made so far was on adding, his word,
   so hand marks and their missing-work records move to 2.OA.B.2a; iReady's
   rows stay on 2.OA.B.2 (they rebuild, and its Algebra score is neither
   half). Report card overrides stay on 2.OA.B.2, still the report card's
   row (until v148, which gives each half its own line). Lists of standards (class goals, year goals) take both halves; a
   group, its goal and its pins take adding, as their marks were.
   Once, and flagged: anything he changes afterwards stays. */
const FL20 = "2.OA.B.2", FL20_ADD = "2.OA.B.2a", FL20_SUB = "2.OA.B.2b";
function fl20Codes(codes) {
  if (!Array.isArray(codes) || codes.indexOf(FL20) < 0) return codes;
  const out = [];
  codes.forEach(c => { (c === FL20 ? [FL20_ADD, FL20_SUB] : [c]).forEach(x => { if (out.indexOf(x) < 0) out.push(x); }); });
  return out;
}
function splitFluency20(st) {
  if (st.seeded.fluency20Split) return;
  st.scores.forEach(x => { if (x && x.std === FL20 && !x.source) x.std = FL20_ADD; });
  st.missing.forEach(x => { if (x && x.std === FL20) x.std = FL20_ADD; });
  if (st.active[FL20]) { st.active[FL20_ADD] = true; st.active[FL20_SUB] = true; delete st.active[FL20]; }
  Object.keys(st.groupPins).forEach(k => {
    const m = /^(.*)\|2\.OA\.B\.2$/.exec(k);
    if (!m) return;
    const to = m[1] + "|" + FL20_ADD;
    if (!st.groupPins[to]) st.groupPins[to] = st.groupPins[k];
    delete st.groupPins[k];
  });
  Object.keys(st.unitMap).forEach(k => {
    const cur = st.unitMap[k];
    if (!Array.isArray(cur) || cur.indexOf(FL20) < 0) return;
    const R = window.RevealPacing, u = /^math\|(\d+)$/.exec(k);
    const halves = u && R ? R.unitOregon(Number(u[1])).filter(c => c === FL20_ADD || c === FL20_SUB) : [];
    const out = [];
    cur.forEach(c => { (c === FL20 ? (halves.length ? halves : [FL20_ADD, FL20_SUB]) : [c]).forEach(x => { if (out.indexOf(x) < 0) out.push(x); }); });
    st.unitMap[k] = out;
  });
  st.goals.forEach(g => {
    if (!g) return;
    g.codes = fl20Codes(g.codes);
    /* a group goal follows its group, which goes to adding; a class goal
       keeps 2.OA.B.2 as its name and counts both halves */
    if (g.group && g.focus && g.focus.kind === "std" && g.focus.key === FL20) { g.focus.key = FL20_ADD; g.codes = (g.codes || []).filter(c => c !== FL20_SUB); }
  });
  st.ggroups.forEach(g => { if (g && g.std === FL20) g.std = FL20_ADD; });
  if (st.yearGoals) st.yearGoals.groups.forEach(g => { if (g) g.codes = fl20Codes(g.codes); });
  st.seeded.fluency20Split = 1;
}
/* The unit -> standards map was left empty because only he knew what his
   units covered. The district's Reveal pacing guide now says, lesson by
   lesson, so the math half is filled from it. Once, and flagged: a unit
   he has already ticked is left exactly as it is, and a standard he unticks
   afterwards stays unticked. Unit 1 is grade 1 review and stays empty. */
function seedRevealUnits(st) {
  const R = window.RevealPacing;
  if (!R || st.seeded.revealUnits) return;
  R.UNITS.forEach(u => {
    if (R.priorUnit(u.u)) return;
    const k = "math|" + u.u, cur = st.unitMap[k];
    if (Array.isArray(cur) && cur.length) return;
    const codes = R.unitOregon(u.u).filter(c => byCode[c]);
    if (codes.length) st.unitMap[k] = codes;
  });
  st.seeded.revealUnits = R.VERSION;
}
/* The same, once, for Reading from the Benchmark scope and sequence. Its
   codes are matched from the skill names, not printed by Benchmark, which
   is why the Planning tab says so. Word study stays out: Phonics is ECRI. */
function seedBenchmarkUnits(st) {
  const B = window.BenchmarkScope;
  if (!B || st.seeded.benchmarkUnits) return;
  B.UNITS.forEach(u => {
    const k = "reading|" + u.u, cur = st.unitMap[k];
    if (Array.isArray(cur) && cur.length) return;
    const codes = B.unitCodes(u.u).filter(c => byCode[c]);
    if (codes.length) st.unitMap[k] = codes;
  });
  st.seeded.benchmarkUnits = 1;
}

function blankState() {
  const active = {};
  CATALOG.forEach(s => { if (s.lvl === 1) active[s.c] = true; });
  /* fluency within 20 is marked as its two halves */
  delete active[FL20]; active[FL20_ADD] = true; active[FL20_SUB] = true;
  const y = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return {
    v: 1,
    students: [],
    active,
    rc: JSON.parse(JSON.stringify(DEFAULT_RC)),
    scores: [],
    iready: [],
    orf: [],
    goals: [],
    ggroups: [],
    ggPlace: {},
    ggSugMoves: {},
    yearGoals: null,
    orfLink: {},
    missing: [],
    mergeLog: null,
    unitMap: {},
    unitCount: {},
    sub: null,
    terms: splitYear(y + "-09-01", (y + 1) + "-06-11", 4),
    overrides: {},
    groupPins: {},
    settings: { rule: "powerlaw", rcYTD: true, teacher: "", year: y + "\u2013" + (y + 1), showSubs: false,
      orfAutoScore: true, orfStandard: "2.RF.4", orfCuts: { 4: 75, 3: 50, 2: 25 }, orfAgainst: "fall", orfWcpm: { 2: 20, 3: 80, 4: 101 },
      orfSeason: { fall: "08-01", winter: "12-01", spring: "03-01" }, orfAutoLink: true,
      yearStart: y + "-09-01", yearEnd: (y + 1) + "-06-11", carryForward: true, studentGrade: 2, subject: "Math",
      ireadyAutoScore: true, ireadyInReport: true, ireadyCuts: { 4: 1, 3: 0, 2: -1 }, ireadyMap: null,
      noMapPrompts: false, mathCodes: "oregon", rcIreadyFill: true }
  };
}
let S = blankState();
let UI = {
  tab: "enter",
  subject: "Math",
  enterStd: "",
  enterDate: todayISO(),
  enterMode: "standard",
  enterCtx: "",
  /* The Reveal day being graded, as an index into the guide, or null to
     follow the date: the lesson the planner has on it. */
  enterLesson: null,
  /* the card takes the day's lesson (its standard and name) when it
     opens and when the date changes; see followDayLesson() */
  enterFollow: true,
  /* the unit being looked through in the Unit menu, or null for the lesson's own */
  enterUnit: null,
  /* the standards being graded together, or null for one at a time */
  enterMulti: null,
  lastAll: null,
  enterStudent: "",
  groupWindow: "0",
  groupEvidence: "both",
  groupStd: "",
  groupCount: 4,
  studentSel: "",
  reportTerm: "",           /* "" = the term we are in */
  rcSel: null,              /* { sid, code } the why panel shows */
  orfOrder: "need",         /* Reading progress, needs attention first or A-Z */
  studentTerm: "",          /* the term the student page lists assignments for ("" = the current one, "all" = the year) */
  studentUnmarked: false,   /* only the assignments still without this child's mark */   /* the entry sheet, one column per standard or one block per student */
  subDate: null,
  ireadyRows: null,
  orfCands: null,
  orfCand: null,
  orfCandIdx: 0,
  orfMap: {},
  orfPeople: {},
  lastMissingBatch: [],
  ireadyMap: null,
  log: []
};

/* The day a timestamp falls on *here*. The running-records tool stamps a
   reading with toISOString(), which is UTC, and taking its first ten
   characters put anything entered after about 5pm Pacific on the next day —
   and one on the evening of Nov 30 into the winter window. A bare date is
   already a local day and is taken as written; so is a stamp with no zone,
   which the browser reads as local anyway. */
function localDayOf(v) {
  const s = String(v == null ? "" : v).trim();
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  return s.slice(0, 10);
}
function todayISO() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function load() {
  try { const raw = window.localStorage.getItem(KEY); if (raw) S = hydrate(JSON.parse(raw)); }
  catch (e) { console.warn(e); }
  /* memory now matches storage; later saves merge rather than overwrite */
  if (window.SuiteSync && window.SuiteSync.adopted) window.SuiteSync.adopted(KEY);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); if (typeof pushRosterToOrf === "function") pushRosterToOrf(); if (typeof schedulePublish === "function") schedulePublish(); } catch (e) { toast("Could not save \u2014 browser storage may be full"); } }
function esc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
let toastT;
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200); }

/* ============================================================
   DERIVED HELPERS
   ============================================================ */
function sortedStudents() {
  return S.students.slice().sort((a, b) => (a.last + a.first).toLowerCase().localeCompare((b.last + b.first).toLowerCase()));
}
function fullName(st) { return st ? (st.first + " " + st.last).trim() : ""; }
/* the other names a child goes by: Setup → Roster → Also called */
function akaOf(st) { return window.SuiteNames ? window.SuiteNames.akaList(st && st.aka) : []; }
function nickHint(st) { const f = String(st.first || ""); return f.length > 4 ? f.slice(0, 3) : "a nickname"; }
/* listed in Setup and the mapping pickers: main standards, sub-standards
   when "Show sub-standards" is on, and any marked `shown` */
function stdListed(s) { return !!(S.settings.showSubs || s.lvl === 1 || s.shown); }
function activeCodes(subject) {
  return CATALOG.filter(s => S.active[s.c] && (!subject || subject === "All" || s.s === subject)).map(s => s.c);
}
function scoresFor(sid, code) {
  return S.scores.filter(x => x.sid === sid && x.std === code).sort((a, b) => a.date.localeCompare(b.date));
}
function latest(sid, code) { const a = scoresFor(sid, code); return a.length ? a[a.length - 1] : null; }
function inWindow(sc, days) {
  if (!days || days === "0") return true;
  const cut = new Date(); cut.setDate(cut.getDate() - Number(days));
  return new Date(sc.date) >= cut;
}
function markHTML(v) { return '<span class="mark ' + (v ? "v" + v : "vnone") + '">' + (v || "\u2013") + "</span>"; }
function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }
/* Marzano's power law. Scores in date order are fitted to y = a\u00b7x^b
   (least squares on the logs, x = 1, 2, 3, \u2026) and the curve is read at the
   newest score: where the child is now, with later work counting more. It
   needs a trend to fit, so with fewer than POWER_MIN scores the plain
   average stands in (and the report card flags it). Clamped to 1\u20134. */
const POWER_MIN = 3;
function powerFit(vals) {
  const n = vals.length;
  const xs = vals.map((_, i) => Math.log(i + 1)), ys = vals.map(v => Math.log(Math.max(0.1, v)));
  const mx = avg(xs), my = avg(ys);
  let sxx = 0, sxy = 0;
  xs.forEach((x, i) => { sxx += (x - mx) * (x - mx); sxy += (x - mx) * (ys[i] - my); });
  const b = sxx ? sxy / sxx : 0, a = my - b * mx;
  return { a: a, b: b, at: i => Math.max(1, Math.min(4, Math.exp(a + b * Math.log(i + 1)))), n: n };
}
function powerLaw(vals) {
  if (!vals.length) return null;
  if (vals.length < POWER_MIN) return Math.round(avg(vals) * 100) / 100;
  const f = powerFit(vals);
  return Math.round(f.at(vals.length - 1) * 100) / 100;
}
function computeMark(vals) {
  if (!vals.length) return null;
  const rule = S.settings.rule;
  if (rule === "powerlaw") return powerLaw(vals);
  if (rule === "latest") return vals[vals.length - 1];
  if (rule === "mean") return Math.round(avg(vals) * 10) / 10;
  let num = 0, den = 0;
  vals.forEach((v, i) => { const w = i + 1; num += v * w; den += w; });
  return Math.round((num / den) * 10) / 10;
}
function roundMark(x) { return x == null ? null : Math.max(1, Math.min(4, Math.round(x))); }

/* ============================================================
   SHELL
   ============================================================ */
document.querySelectorAll("nav.tabs button").forEach(b => {
  b.addEventListener("click", () => {
    UI.tab = b.dataset.tab;
    document.querySelectorAll("nav.tabs button").forEach(x => x.setAttribute("aria-selected", x === b ? "true" : "false"));
    document.querySelectorAll("section.panel").forEach(p => p.hidden = p.id !== "panel-" + UI.tab);
    render();
  });
});
document.querySelectorAll("#subjswitch button").forEach(b => {
  b.addEventListener("click", () => {
    UI.subject = b.dataset.subj;
    S.settings.subject = UI.subject; save();
    paintSubjSwitch();
    render();
  });
});
/* The corner switcher sends every tool here to set syncing up, since the
   three share an origin and so share the setting.

   The hash also carries parameters, which is what lets one tool hand work to
   another: `#enter?std=2.NBT.B.5&date=2026-09-21&ctx=Reveal%20U3%20L2` opens
   the entry screen already pointed at that assignment. An assignment is not
   a stored thing — it is the marks sharing a standard, a date and a context —
   so those three values are the whole of what has to travel. Unknown
   parameters are ignored, and a bare `#setup` behaves exactly as before. */
function parseHash() {
  const raw = (location.hash || "").replace(/^#/, "");
  if (!raw) return { tab: "", params: {} };
  const cut = raw.indexOf("?");
  const tab = cut < 0 ? raw : raw.slice(0, cut);
  const params = {};
  if (cut >= 0) {
    raw.slice(cut + 1).split("&").forEach(pair => {
      if (!pair) return;
      const eq = pair.indexOf("=");
      const k = decodeURIComponent(eq < 0 ? pair : pair.slice(0, eq));
      const v = eq < 0 ? "" : decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " "));
      if (k) params[k] = v;
    });
  }
  return { tab: tab, params: params };
}

const RETIRED_TABS = { iready: "setup" };   /* Report card is back */
function openTabFromHash() {
  let { tab, params } = parseHash();
  if (RETIRED_TABS[tab]) tab = RETIRED_TABS[tab];
  if (!tab || !document.getElementById("panel-" + tab)) return;

  /* Set the subject before the tab renders: the Math/ELA/Both switch decides
     which standards the entry screen will even offer, so arriving with a
     standard the current switch excludes would silently drop it. */
  if (params.subject && ["Math", "ELA", "All"].includes(params.subject)) {
    UI.subject = params.subject;
    S.settings.subject = UI.subject;
    paintSubjSwitch();
  } else if (params.std && byCode[params.std]) {
    const want = byCode[params.std].s;
    if (UI.subject !== "All" && UI.subject !== want) {
      UI.subject = want;
      S.settings.subject = UI.subject;
      paintSubjSwitch();
    }
  }
  if (params.std && byCode[params.std]) UI.enterStd = params.std;
  /* a link that names the standard or the assignment has chosen; don't follow over it */
  if ((params.std && byCode[params.std]) || params.ctx != null) UI.enterFollow = false;
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) UI.enterDate = params.date;
  if (params.ctx != null) { UI.enterCtx = params.ctx; UI.enterLesson = lessonFromCtx(params.ctx); }
  if (params.student) UI.enterStudent = params.student;
  gotoTab(tab);
}
window.addEventListener("hashchange", openTabFromHash);
function paintSubjSwitch() {
  document.querySelectorAll("#subjswitch button").forEach(x =>
    x.setAttribute("aria-pressed", x.dataset.subj === UI.subject ? "true" : "false"));
}
function subjLabel() { return UI.subject === "All" ? "Math and ELA" : UI.subject; }
function render() {
  if (UI.tab === "enter") renderEnter();
  if (UI.tab === "groups") renderGroups();
  if (UI.tab === "goal") renderClassGoal();
  if (UI.tab === "students") renderStudents();
  if (UI.tab === "orf") renderORF();
  if (UI.tab === "conf") renderConferences();
  if (UI.tab === "report") renderReport();
  if (UI.tab === "setup") renderSetup();
  document.getElementById("metaline").textContent =
    S.students.length + " students \u00b7 " + S.scores.length + " marks \u00b7 " + (S.settings.year || "");
}
function noStudents(el) {
  el.innerHTML = '<div class="card empty"><strong>No students yet</strong>Add your roster in Setup and this fills in.<div style="margin-top:12px"><button class="btn primary" onclick="gotoTab(\'setup\')">Go to Setup</button></div></div>';
}
/* The layout a phone gets: the same test as the stylesheet's own breakpoint. */
function phoneLayout() { try { return window.matchMedia("(max-width: 760px)").matches; } catch (e) { return false; } }
function gotoTab(t) { document.querySelector('nav.tabs button[data-tab="' + t + '"]').click(); }
/* a student's name, wherever the gradebook lists one, opens their page */
function nameLink(st, text) {
  return '<button type="button" class="nmlink" title="Open ' + esc(fullName(st)) + '\u2019s page" onclick="openStudent(\'' + esc(st.id) + '\')">' + esc(text) + "</button>";
}
function openStudent(sid) { UI.studentSel = sid; gotoTab("students"); }
