/* ==========================================================================
   curriculum.js — the Reveal Math Grade 2 pacing guide and the Benchmark
   Advance Grade 2 scope and sequence, as data, and the places the suite
   uses them. One file because the planner takes one added tag.

   Source: the district's "Editable Pacing Guide — Grade 2" (Reveal Math,
   12 units, 153 days). Every lesson carries the standard, the learning
   targets and the materials exactly as the guide prints them, apart from
   the handful of typos listed in HANDOFF.md under v60. Each unit's days add
   up to the guide's own "Time for Unit"; tests/test-reveal-pacing.js
   checks that, so a mistyped day count cannot slip in.

   STANDARDS. The guide uses CCSS codes. The gradebook records the 2021
   Oregon Mathematics Standards, which kept the CCSS codes for OA and NBT
   and renumbered measurement, data and geometry into 2.GM and 2.DR. CROSS
   below is that crosswalk. Marks are still stored under the Oregon code, so
   nothing already entered moves and the report card lines are untouched;
   the gradebook only changes which code it shows. Unit 1 ("Math Is ...")
   teaches to grade 1 standards as a launch, so it maps to nothing in the
   grade 2 gradebook.

   IN THE PLANNER this file takes over Math's stepper. The planner rolls a
   "ul" subject over at a fixed number of lessons per unit; Reveal's units
   run from 5 to 11 lessons, with an opener, a probe, a review and a test
   between them. + and − now walk the guide's own sequence. A lesson is
   still stored as {unit, lesson}, exactly as before, so every day already
   recorded reads the same; a day that is not a lesson adds k (the kind),
   e.g. {unit:2, lesson:4, k:"probe"}. The planner file itself is not
   edited: this is one added <script> tag, and removing it puts the old
   stepper back. Turning the guide off for Math (in Math's position sheet)
   does the same without removing anything.

   Nothing personal is in this file.
   ========================================================================== */
(function () {
  "use strict";
  if (window.RevealPacing) return;

  var VERSION = 1;

  /* ---------- the guide ----------
     u, title, and the guide's day budget (instr, review, probe, extra,
     total). Steps: k = diag | open | L | probe | review | assess | bench |
     summ; n = lesson number (L) or benchmark number; t = title; std = CCSS
     codes as printed; tg = "I can" targets; m = materials; tr = teaching
     resources; note = the guide's instruction for a non-lesson day;
     after = the lesson a non-lesson day follows; d = days. assumedDay marks
     the two cells the guide left blank; the unit totals confirm 1. */
  var UNITS = 
[{"u":1,"title":"Math Is ...","instr":7,"review":2,"probe":0,"extra":1,"total":10,"steps":[{"k":"diag","t":"Course Diagnostic","after":0,"d":1},{"k":"open","t":"Unit 1 Opener","note":"Administer the Math Attitude Survey, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Math Is Mine","std":["1.NBT.B.3"],"tg":["I can tell my math story.","I can recognize the ways in which we are all doers of math."],"m":["blank paper","crayons, markers, or colored pencils"],"d":1},{"k":"L","n":2,"t":"Math Is Exploring and Thinking","std":["1.OA.A.2"],"tg":["I can make sense of a problem and explore solutions pathways.","I can think about numbers in different ways."],"tr":["Number Cards 0–10"],"d":1},{"k":"L","n":3,"t":"Math Is In My World","std":["1.NBT.C.6"],"tg":["I can represent a real-world situation using mathematics.","I can explain how to use tools to solve a problem."],"m":["base-ten blocks"],"tr":["Number Chart 1–100"],"d":1},{"k":"L","n":4,"t":"Math Is Explaining and Sharing","std":["1.NBT.C.4"],"tg":["I can explain my thinking.","I can listen to the ideas of my classmates."],"tr":["Number Cards 0–10"],"d":1},{"k":"L","n":5,"t":"Math Is Finding Patterns","std":["1.OA.C.6"],"tg":["I can describe and extend a pattern.","I can use patterns to solve problems."],"d":1},{"k":"L","n":6,"t":"Math Is Ours","std":["1.NBT.A.1"],"tg":["I can explain how to work well on my own and in a group.","I can describe the steps I can take to solve math problems."],"m":["markers, crayons, or colored pencils","poster-sized paper"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":6,"d":1}]},
{"u":2,"title":"Place Value to 1,000","instr":6,"review":2,"probe":0.5,"extra":0.5,"total":9,"steps":[{"k":"open","t":"Unit 2 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Understand Hundreds","std":["2.NBT.A.1","2.NBT.A.1.a"],"tg":["I can explain how 10 groups of ten equal 100."],"m":["base-ten blocks"],"d":1},{"k":"L","n":2,"t":"Understand 3-Digit Numbers","std":["2.NBT.A.1","2.NBT.A.1.b"],"tg":["I can identify the digits in a 3-digit number.","I can show 3-digit numbers."],"m":["base-ten blocks"],"tr":["3-Digit Numbers"],"d":1},{"k":"L","n":3,"t":"Read and Write Numbers to 1,000","std":["2.NBT.A.3"],"tg":["I can read numbers to 1,000.","I can write numbers to 1,000."],"m":["base-ten blocks","notecards"],"d":1},{"k":"L","n":4,"t":"Decompose 3-Digit Numbers","std":["2.NBT.A.1","2.NBT.A.3"],"tg":["I can use my understanding of place value to decompose 3-digit numbers in different ways."],"m":["base-ten blocks"],"d":1},{"k":"probe","t":"Formative Math Probe: Building Numbers","note":"Administer the Formative Math Probe to gather data on students’ understanding composing and decomposing numbers based on different place-value combinations, with regrouping as needed. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":4,"d":0.5},{"k":"L","n":5,"t":"Compare 3-Digit Numbers","std":["2.NBT.A.4"],"tg":["I can compare 3-digit numbers.","I can use words and symbols to show comparisons."],"m":["base-ten blocks"],"tr":["Number Cards 0–10"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":5,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":5,"d":1}]},
{"u":3,"title":"Patterns within Numbers","instr":8,"review":2,"probe":0.5,"extra":1.5,"total":12,"steps":[{"k":"open","t":"Unit 3 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Counting Problems","std":["2.NBT.A.2"],"tg":["I can count by 1s within 1,000.","I can identify patterns when counting by 1s within 1,000."],"m":["counters"],"tr":["Number Cards 0–10","Number Chart 201–300","Number Chart 401–500"],"d":1},{"k":"L","n":2,"t":"Patterns When Skip Counting by 5s","std":["2.NBT.A.2"],"tg":["I can identify patterns when skip counting by 5s.","I can describe patterns when skip counting by 5s."],"tr":["Number Chart 1–100"],"d":1},{"k":"L","n":3,"t":"Patterns When Skip Counting by 10s and 100s","std":["2.NBT.A.2"],"tg":["I can identify patterns when skip counting by 10s and 100s.","I can describe patterns when skip counting by 10s and 100s."],"m":["number cubes"],"tr":["Number Chart 1–100"],"d":1},{"k":"probe","t":"Formative Math Probe: Counting by 1s, 5s, and 10s","note":"Administer the Formative Math Probe to gather data on students’ understanding of counting by 1s, 5s, and 10s. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":3,"d":0.5},{"k":"L","n":4,"t":"Understand Even and Odd Numbers","std":["2.OA.C.3"],"tg":["I can determine whether the number of objects in a group is even or odd.","I can recognize the patterns within even and odd numbers."],"m":["counters"],"tr":["Number Cards 0–10"],"d":1},{"k":"L","n":5,"t":"Addition Patterns","std":["2.OA.C.3"],"tg":["I can write an equation to show an even number as a sum of doubles.","I can write an equation to show an odd number as a sum of near doubles."],"m":["connecting cubes"],"d":1},{"k":"L","n":6,"t":"Patterns and Arrays","std":["2.OA.C.4"],"tg":["I can skip count to find the total number of objects in an array.","I can represent equal groups with arrays."],"m":["counters","paper clips"],"d":1},{"k":"L","n":7,"t":"Use Arrays to Add","std":["2.OA.C.4"],"tg":["I can write equations to describe arrays.","I can represent the total number of objects using arrays."],"m":["connecting cubes","counters"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":7,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":7,"d":1}]},
{"u":4,"title":"Meanings of Addition and Subtraction","instr":11,"review":3,"probe":0.5,"extra":1.5,"total":16,"steps":[{"k":"open","t":"Unit 4 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Represent and Solve Add To Problems","std":["2.OA.A.1"],"tg":["I can represent Add To problems.","I can solve Add To problems."],"m":["number cubes 0–5 and 5–10"],"tr":["Part-Part-Whole Mat","Word Problem Cards"],"d":1},{"k":"L","n":2,"t":"Represent and Solve Take From Problems","std":["2.OA.A.1"],"tg":["I can represent Take From problems.","I can solve Take From problems."],"m":["number cubes 0–5 and 5–10"],"tr":["Bar Diagram","Word Problem Cards"],"d":1},{"k":"L","n":3,"t":"Solve Two-Step Add To and Take From Problems","std":["2.OA.A.1"],"tg":["I can represent two-step Add To and Take From problems.","I can solve two-step Add To and Take From problems."],"m":["number cubes 5–10"],"tr":["Word Problem Cards"],"d":1},{"k":"L","n":4,"t":"Represent and Solve Put Together Problems","std":["2.OA.A.1"],"tg":["I can represent Put Together problems.","I can solve Put Together problems."],"m":["number cubes 0–5 and 5–10"],"tr":["Part-Part-Whole Mat","Word Problem Cards"],"d":1},{"k":"L","n":5,"t":"Represent and Solve Take Apart Problems","std":["2.OA.A.1"],"tg":["I can represent Take Apart problems.","I can solve Take Apart problems."],"m":["number cubes 0–5 and 5–10"],"tr":["Word Problem Cards"],"d":1},{"k":"L","n":6,"t":"Solve Two-Step Put Together and Take Apart Problems","std":["2.OA.A.1"],"tg":["I can represent two-step Put Together and Take Apart problems.","I can solve two-step Put Together and Take Apart problems."],"m":["number cubes 0–5"],"tr":["Word Problem Cards"],"d":1},{"k":"L","n":7,"t":"Represent and Solve Compare Problems","std":["2.OA.A.1"],"tg":["I can represent Compare problems where the greater quantity is unknown.","I can solve Compare problems where the greater quantity is unknown."],"m":["number cubes 0–5 and 5–10"],"tr":["Bar Diagram","Word Problem Cards"],"d":1},{"k":"L","n":8,"t":"Represent and Solve More Compare Problems","std":["2.OA.A.1"],"tg":["I can represent Compare problems where the lesser quantity is unknown.","I can solve Compare problems where the lesser quantity is unknown."],"m":["number cubes 0–5 and 5–10"],"tr":["Bar Diagram","Word Problem Cards"],"d":1},{"k":"probe","t":"Formative Math Probe: Addition and Subtraction Equations","note":"Administer the Formative Math Probe to gather data on students’ ability to solve a problem using a strategy of their choice. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":8,"d":0.5},{"k":"L","n":9,"t":"Solve Two-Step Problems with Comparison","std":["2.OA.A.1"],"tg":["I can represent two-step Compare problems.","I can solve two-step Compare problems."],"m":["base-ten blocks","number cubes 0–5"],"tr":["Word Problem Cards"],"d":1},{"k":"L","n":10,"t":"Solve Two-Step Problems Using Addition and Subtraction","std":["2.OA.A.1"],"tg":["I can represent two-step word problems using addition and subtraction.","I can solve two-step word problems using addition and subtraction."],"m":["connecting cubes","number cubes 0–5"],"tr":["Word Problem Cards"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":10,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":10,"d":1},{"k":"bench","n":1,"t":"Benchmark Assessment 1","after":10,"d":1}]},
{"u":5,"title":"Strategies to Fluently Add within 100","instr":11,"review":2,"probe":0.5,"extra":1.5,"total":15,"steps":[{"k":"open","t":"Unit 5 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Strategies to Add Fluently within 20","std":["2.OA.B.2"],"tg":["I can add fluently within 20 by counting on.","I can add fluently within 20 by making a 10."],"tr":["Number Line 0–20"],"d":1},{"k":"L","n":2,"t":"More Strategies to Add Fluently within 20","std":["2.OA.B.2"],"tg":["I can add fluently within 20.","I can use doubles and near doubles to help me add within 20."],"m":["counters"],"tr":["Number Cards 0–10"],"d":1},{"k":"L","n":3,"t":"Represent Addition with 2-Digit Numbers","std":["2.NBT.B.5"],"tg":["I can use base-ten blocks to help me add 2-digit numbers.","I can explain how to use base-ten blocks to add 2-digit numbers."],"m":["base-ten blocks"],"tr":["Place-Value Chart"],"d":1},{"k":"L","n":4,"t":"Use Properties to Add","std":["2.NBT.B.5"],"tg":["I can add addends in any order to find the sum.","I can explain that addends added in any order have the same sum."],"m":["base-ten blocks"],"tr":["Number Chart 0–100","Place-Value Chart"],"d":1},{"k":"L","n":5,"t":"Decompose Two Addends to Add","std":["2.NBT.B.5"],"tg":["I can decompose two addends to help me add.","I can explain how to decompose both addends to add two 2-digit numbers."],"m":["base-ten blocks","index cards"],"tr":["Place-Value Chart"],"d":1},{"k":"L","n":6,"t":"Use a Number Line to Add","std":["2.MD.B.6"],"tg":["I can use a number line to help me add.","I can explain how to use a number line to add."],"m":["base-ten blocks"],"tr":["Number Lines and Bars (Addition)"],"d":1},{"k":"L","n":7,"t":"Decompose One Addend to Add","std":["2.NBT.B.5"],"tg":["I can decompose one addend to help me add.","I can explain how to decompose one addend to add."],"tr":["Blank Open Number Lines"],"d":1},{"k":"L","n":8,"t":"Adjust Addends to Add","std":["2.NBT.B.5"],"tg":["I can adjust addends to make them friendlier to add.","I can explain how to adjust addends to add within 100."],"m":["base-ten blocks"],"tr":["Blank Open Number Lines"],"d":1},{"k":"probe","t":"Formative Math Probe: Addition Strategies","note":"Administer the Formative Math Probe to gather data on students’ ability to determine whether a given strategy is a correct approach to add two 2-digit numbers. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":8,"d":0.5},{"k":"L","n":9,"t":"Add More Than Two Numbers","std":["2.NBT.B.6"],"tg":["I can decompose or adjust addends to add more than two 2-digit numbers.","I can explain how to decompose and adjust addends to add more than two 2-digit numbers."],"m":["number cubes"],"d":1},{"k":"L","n":10,"t":"Solve One- and Two-Step Problems Using Addition","std":["2.OA.A.1"],"tg":["I can solve one- and two-step addition word problems.","I can explain how to solve one- and two-step addition word problems."],"m":["paper"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":10,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":10,"d":1}]},
{"u":6,"title":"Strategies to Fluently Subtract within 100","instr":11,"review":2,"probe":0.5,"extra":2.5,"total":16,"steps":[{"k":"open","t":"Unit 6 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Strategies to Subtract Fluently within 20","std":["2.OA.B.2"],"tg":["I can count on and count back to subtract within 20.","I can explain how to count on and count back to subtract within 20."],"m":["number cubes"],"tr":["Number Cards 0–10","Number Line 0–20"],"d":1},{"k":"L","n":2,"t":"More Strategies to Subtract Fluently within 20","std":["2.OA.B.2"],"tg":["I can make a 10 and use addition to subtract within 20.","I can explain how to subtract within 20 by making a 10 or using addition."],"m":["number cubes"],"tr":["Number Bond 1","Number Cards 0–10","Number Cards 11–19","Number Line 0–20","Ten-Frames"],"d":1},{"k":"L","n":3,"t":"Represent Subtraction with 2-Digit Numbers","std":["2.NBT.B.5"],"tg":["I can subtract 2-digit numbers.","I can represent subtracting 2-digit numbers."],"m":["base-ten blocks"],"tr":["Blank Open Number Lines","Number Chart 1–100"],"d":1},{"k":"L","n":4,"t":"Represent 2-Digit Subtraction with Regrouping","std":["2.NBT.B.5"],"tg":["I can subtract 2-digit numbers with regrouping.","I can represent 2-digit subtraction with regrouping."],"m":["base-ten blocks"],"tr":["Number Chart 1–100"],"d":1},{"k":"L","n":5,"t":"Use a Number Line to Subtract","std":["2.MD.B.6"],"tg":["I can use a number line to subtract.","I can explain how to use a number line to subtract."],"m":["number cubes"],"tr":["Number Cards 11–19","Number Line and Bars (Subtraction)"],"d":1},{"k":"L","n":6,"t":"Decompose Numbers to Subtract","std":["2.NBT.B.5"],"tg":["I can decompose 2-digit numbers to help me subtract.","I can explain how to decompose 2-digit numbers to make subtracting friendlier."],"tr":["Blank Open Number Lines","Decomposition Boxes and Arrows"],"d":1},{"k":"L","n":7,"t":"Adjust Numbers to Subtract","std":["2.NBT.B.5"],"tg":["I can adjust and subtract 2-digit numbers.","I can explain how to adjust 2-digit numbers for friendlier subtraction."],"m":["paper and pencil"],"d":1},{"k":"probe","t":"Formative Math Probe: Subtraction Strategies","note":"Administer the Formative Math Probe to gather data on students’ ability to determine if a given strategy is a correct approach to perform 2-digit subtraction. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":7,"d":0.5},{"k":"L","n":8,"t":"Relate Addition to Subtraction","std":["2.NBT.B.5"],"tg":["I can use addition to solve 2-digit subtraction equations.","I can explain how to use addition to solve 2-digit subtraction equations."],"m":["index cards","number cubes"],"tr":["Part-Part-Whole Mat"],"d":1},{"k":"L","n":9,"t":"Solve One-Step Problems Using Subtraction","std":["2.OA.A.1"],"tg":["I can use subtraction strategies to solve one-step problems.","I can explain how to solve one-step problems using subtraction."],"m":["base-ten blocks"],"tr":["Blank Open Number Lines"],"d":1},{"k":"L","n":10,"t":"Solve Two-Step Problems Using Subtraction","std":["2.OA.A.1"],"tg":["I can use subtraction strategies to solve two-step problems.","I can explain how to solve two-step problems using subtraction."],"m":["number cubes"],"tr":["Number Cards 0–1200"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":10,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":10,"d":1}]},
{"u":7,"title":"Measure and Compare Lengths","instr":12,"review":3,"probe":0.5,"extra":1.5,"total":17,"steps":[{"k":"open","t":"Unit 7 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Measure Length with Inches","std":["2.MD.A.1"],"tg":["I can measure length in inches."],"m":["classroom objects"],"tr":["Inch Ruler","Number Cards 0–10"],"d":1},{"k":"L","n":2,"t":"Measure Length with Feet and Yards","std":["2.MD.A.1"],"tg":["I can measure length in feet and yards."],"m":["classroom objects","number cube"],"tr":["Inch Ruler","Yard Measuring Tape"],"d":1},{"k":"L","n":3,"t":"Compare Lengths Using Customary Units","std":["2.MD.A.4"],"tg":["I can compare lengths using customary units."],"tr":["Inch Ruler","Yard Measuring Tape"],"d":1},{"k":"L","n":4,"t":"Relate Inches, Feet, and Yards","std":["2.MD.A.2"],"tg":["I can explain the relationships between inches, feet, and yards."],"tr":["Inch Ruler","Yard Measuring Tape"],"d":1},{"k":"L","n":5,"t":"Estimate Length Using Customary Units","std":["2.MD.A.3"],"tg":["I can use everyday items to help me estimate length in customary units."],"m":["connecting cubes"],"tr":["Inch Ruler"],"d":1},{"k":"L","n":6,"t":"Measure Length with Centimeters and Meters","std":["2.MD.A.1"],"tg":["I can measure length with centimeters and meters."],"tr":["Centimeter Ruler","Meter Measuring Tape"],"d":1},{"k":"L","n":7,"t":"Compare Lengths Using Metric Units","std":["2.MD.A.4"],"tg":["I can compare lengths using metric units."],"tr":["Centimeter Ruler","Meter Measuring Tape"],"d":1},{"k":"L","n":8,"t":"Relate Centimeters and Meters","std":["2.MD.A.2"],"tg":["I can explain the relationship between centimeters and meters."],"tr":["Centimeter Ruler","Meter Measuring Tape","Number Cards 0–10"],"d":1},{"k":"probe","t":"Formative Math Probe: Relating Measurement","note":"Administer the Formative Math Probe to gather data on students’ understanding of units of measure and their ability to determine the unit used to measure objects. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":8,"d":0.5},{"k":"L","n":9,"t":"Estimate Length Using Metric Units","std":["2.MD.A.3"],"tg":["I can use everyday items to help me estimate length in metric units."],"tr":["Centimeter Ruler","Meter Measuring Tape"],"d":1},{"k":"L","n":10,"t":"Solve Problems Involving Length","std":["2.MD.B.5"],"tg":["I can solve problems involving length."],"m":["base-ten blocks"],"tr":["Number Chart 1–100","Yard Measuring Tape"],"d":1},{"k":"L","n":11,"t":"Solve More Problems Involving Length","std":["2.MD.B.5","2.MD.B.6"],"tg":["I can use a number line to solve problems involving length."],"tr":["Blank Number Lines 2","Centimeter Ruler"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":11,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":11,"d":1},{"k":"bench","n":2,"t":"Benchmark Assessment 2","after":11,"d":1}]},
{"u":8,"title":"Measurement: Money and Time","instr":6,"review":2,"probe":0.5,"extra":1.5,"total":10,"steps":[{"k":"open","t":"Unit 8 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Understand the Values of Coins","std":["2.MD.C.8"],"tg":["I can determine the value of different types of coins.","I can skip count to determine the value of a group of like coins."],"m":["counters","pennies, nickels, dimes, and quarters"],"tr":["Coin Value Cards"],"d":1},{"k":"L","n":2,"t":"Solve Money Problems Involving Coins","std":["2.MD.C.8"],"tg":["I can determine the value of a group of mixed coins."],"m":["paper bag","pennies, nickels, dimes, and quarters"],"tr":["Number Chart 1–100"],"d":1},{"k":"probe","t":"Formative Math Probe: Counting Coins","note":"Administer the Formative Math Probe to gather data on students’ understanding of the value of coins and their ability to determine the value of a group of coins. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":2,"d":0.5},{"k":"L","n":3,"t":"Solve Money Problems Involving Dollar Bills and Coins","std":["2.MD.C.8"],"tg":["I can determine the value of a group of mixed coins or dollar bills."],"m":["index cards"],"d":1},{"k":"L","n":4,"t":"Tell Time to the Nearest Five Minutes","std":["2.MD.C.7"],"tg":["I can tell time on a digital clock.","I can skip count to help me tell time on an analog clock."],"m":["student clocks"],"tr":["Clocks","Time Cards"],"d":1},{"k":"L","n":5,"t":"Be Precise When Telling Time","std":["2.MD.C.7"],"tg":["I can determine if the time of an event is a.m. or p.m."],"m":["index cards","student clocks"],"tr":["Timeline"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":5,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":5,"d":1}]},
{"u":9,"title":"Strategies to Add 3-Digit Numbers","instr":8,"review":2,"probe":0.5,"extra":1.5,"total":12,"steps":[{"k":"open","t":"Unit 9 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Use Mental Math to Add 10 or 100","std":["2.NBT.B.8"],"tg":["I can mentally add 10 or 100 to a 3-digit number."],"m":["base-ten blocks","number cubes"],"tr":["Blank Open Number Lines"],"d":1},{"k":"L","n":2,"t":"Represent Addition with 3-Digit Numbers","std":["2.NBT.B.7"],"tg":["I can add 3-digit numbers without regrouping."],"m":["base-ten blocks"],"tr":["Hundreds, Tens, and Ones Place-Value Chart","Number Cards 0–10"],"d":1},{"k":"L","n":3,"t":"Represent Addition with 3-Digit Numbers with Regrouping","std":["2.NBT.B.7"],"tg":["I can regroup ones and tens to add 3-digit numbers."],"m":["base-ten blocks","number cubes"],"tr":["Hundreds, Tens, and Ones Place-Value Chart"],"d":1},{"k":"L","n":4,"t":"Decompose Addends to Add 3-Digit Numbers","std":["2.NBT.B.7"],"tg":["I can decompose to add two addends to help me add 3-digit numbers."],"m":["base-ten blocks","index cards"],"tr":["Hundreds, Tens, and Ones Place-Value Chart"],"d":1},{"k":"L","n":5,"t":"Decompose One Addend to Add 3-Digit Numbers","std":["2.NBT.B.7"],"tg":["I can decompose one addend to add 3-digit numbers."],"m":["base-ten blocks","number cubes 0–5"],"tr":["Blank Open Number Lines"],"d":1},{"k":"L","n":6,"t":"Adjust Addends to Add 3-Digit Numbers","std":["2.NBT.B.7"],"tg":["I can adjust addends to make them friendlier to add."],"m":["base-ten blocks","number cubes"],"tr":["Blank Open Number Lines"],"d":1},{"k":"L","n":7,"t":"Explain Addition Strategies","std":["2.NBT.B.9"],"tg":["I can explain addition strategies to add 3-digit numbers."],"m":["number cubes 0–5 and 5–10"],"d":1},{"k":"probe","t":"Formative Math Probe: Addition Word Problems","note":"Administer the Formative Math Probe to gather data on students’ ability to solve 3-digit addition word problems involving two addends and compare the solution to a given number. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":7,"d":0.5},{"k":"review","t":"Unit Review and Fluency Practice","after":7,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":7,"d":1}]},
{"u":10,"title":"Strategies to Subtract 3-Digit Numbers","instr":10,"review":3,"probe":0.5,"extra":1.5,"total":15,"steps":[{"k":"open","t":"Unit 10 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Use Mental Math to Subtract 10 or 100","std":["2.NBT.B.8"],"tg":["I can mentally subtract 10 and 100 from a 3-digit number."],"m":["base-ten blocks"],"tr":["Blank Open Number Lines","Number Cards 0–10"],"d":1},{"k":"L","n":2,"t":"Represent Subtraction with 3-Digit Numbers","std":["2.NBT.B.7"],"tg":["I can subtract 3-digit numbers without regrouping."],"m":["base-ten blocks"],"tr":["Blank Open Number Lines","Place Value Chart"],"d":1},{"k":"L","n":3,"t":"Decompose One 3-Digit Number to Count Back","std":["2.NBT.B.7"],"tg":["I can decompose one 3-digit number to count back."],"tr":["Blank Open Number Lines","Number Cards 0–10"],"d":1},{"k":"L","n":4,"t":"Count On to Subtract 3-Digit Numbers","std":["2.NBT.B.7"],"tg":["I can count on to subtract 3-digit numbers."],"m":["index cards","number cubes"],"tr":["Blank Open Number Lines"],"d":1},{"k":"L","n":5,"t":"Regroup Tens","std":["2.NBT.B.7"],"tg":["I can regroup tens to subtract 3-digit numbers."],"m":["base-ten blocks"],"tr":["Number Cards 0–10"],"d":1},{"k":"L","n":6,"t":"Regroup Tens and Hundreds","std":["2.NBT.B.7"],"tg":["I can regroup tens and hundreds to subtract 3-digit numbers."],"m":["base-ten blocks","number cubes 0–5"],"tr":["Number Cards 0–10"],"d":1},{"k":"L","n":7,"t":"Adjust Numbers to Subtract 3-Digit Numbers","std":["2.NBT.B.7"],"tg":["I can adjust 3-digit numbers to make them friendlier to subtract."],"m":["number cubes"],"tr":["Blank Open Number Lines"],"d":1},{"k":"L","n":8,"t":"Explain Subtraction Strategies","std":["2.NBT.B.9"],"tg":["I can explain subtraction strategies to subtract 3-digit numbers."],"m":["number cubes"],"d":1},{"k":"L","n":9,"t":"Solve Problems Involving Addition and Subtraction","std":["2.NBT.B.7"],"tg":["I can use addition or subtraction strategies to help me solve one- and two-step word problems."],"m":["base-ten blocks"],"d":1},{"k":"probe","t":"Formative Math Probe: Addition and Subtraction Problems","note":"Administer the Formative Math Probe to gather data on students’ understanding of subtraction strategies and their ability to solve a problem using a strategy of their choice. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":9,"d":0.5},{"k":"review","t":"Unit Review and Fluency Practice","after":9,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":9,"d":1},{"k":"bench","n":3,"t":"Benchmark Assessment 3","after":9,"d":1}]},
{"u":11,"title":"Data Analysis","instr":7,"review":2,"probe":0.5,"extra":0.5,"total":10,"steps":[{"k":"open","t":"Unit 11 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Understand Picture Graphs","std":["2.MD.D.10"],"tg":["I can draw a picture graph to represent data.","I can describe how to create a picture graph."],"tr":["Picture Graph"],"d":1},{"k":"L","n":2,"t":"Understand Bar Graphs","std":["2.MD.D.10"],"tg":["I can draw a bar graph to represent data.","I can explain how to read data in a bar graph."],"m":["connecting cubes"],"tr":["Bar Graphs"],"d":1},{"k":"L","n":3,"t":"Solve Problems Using Bar Graphs","std":["2.MD.D.10"],"tg":["I can use a bar graph to solve problems."],"m":["connecting cubes","brown paper bag"],"tr":["Bar Graphs"],"d":1},{"k":"L","n":4,"t":"Collect Measurement Data","std":["2.MD.D.9"],"tg":["I can collect measurement data by measuring the length of objects.","I can explain how to collect data from measurements I have taken of various objects."],"m":["base-ten tens rods","centimeter ruler","connecting cubes","inch rulers","measuring tape"],"tr":["Tally Chart"],"d":1},{"k":"L","n":5,"t":"Understand Line Plots","std":["2.MD.D.9"],"tg":["I can interpret the measurement data on a line plot."],"m":["paper"],"d":1},{"k":"probe","t":"Formative Math Probe: Reading Line Plots","note":"Administer the Formative Math Probe to gather data on students’ understanding of how line plots are used to record, organize, and compare data. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":5,"d":0.5},{"k":"L","n":6,"t":"Show Data on a Line Plot","std":["2.MD.D.9"],"tg":["I can make a line plot to show the measurement of lengths of objects."],"tr":["Line Plot"],"d":1,"assumedDay":true},{"k":"review","t":"Unit Review and Fluency Practice","after":6,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":6,"d":1}]},
{"u":12,"title":"Geometric Shapes and Equal Shares","instr":7,"review":3,"probe":0.5,"extra":0.5,"total":11,"steps":[{"k":"open","t":"Unit 12 Opener","note":"Administer the Readiness Diagnostic, Introduce the Unit Focus Question and STEM in Action Video, Complete the Ignite! activity","after":0,"d":1},{"k":"L","n":1,"t":"Recognize 2-Dimensional Shapes by Their Attributes","std":["2.G.A.1"],"tg":["I can recognize 2-dimensional shapes."],"tr":["2-Dimensional Shapes"],"d":1},{"k":"L","n":2,"t":"Draw 2-Dimensional Shapes from Their Attributes","std":["2.G.A.1"],"tg":["I can draw 2-dimensional shapes."],"m":["geoboards","number cubes","straightedges"],"d":1},{"k":"L","n":3,"t":"Recognize 3-Dimensional Shapes by Their Attributes","std":["2.G.A.1"],"tg":["I can recognize 3-dimensional shapes."],"m":["geometric solids (cones, cubes, cylinders, rectangular prisms, and spheres)","real-life solids"],"d":1},{"k":"L","n":4,"t":"Understand Equal Shares","std":["2.G.A.3"],"tg":["I can identify equal shares.","I can partition 2-dimensional shapes into equal shares."],"m":["number cubes","paper circles, rectangles, and squares","scissors","string","tape"],"d":1,"assumedDay":true},{"k":"probe","t":"Formative Math Probe: Partitioning Shapes","note":"Administer the Formative Math Probe to gather data on students’ ability to generalize the concept of equal partitions to shapes other than circles and rectangles. You may want to administer the probe at the end of the previous lesson, so class time on this day can be spent on clarifying uncovered misconceptions.","after":4,"d":0.5},{"k":"L","n":5,"t":"Relate Equal Shares","std":["2.G.A.3"],"tg":["I can partition a shape into halves, thirds, or fourths in more than one way.","I can relate shapes with equal shares."],"m":["paper circles and rectangles","spinner labeled 2, 3, 4","string","tape"],"d":1},{"k":"L","n":6,"t":"Partition a Rectangle into Rows and Columns","std":["2.G.A.2"],"tg":["I can partition rectangles into rows and columns of squares of equal size.","I can count the squares in a partitioned rectangle to find the total number of squares."],"m":["1-inch grid paper","1-inch square tiles","color tiles"],"d":1},{"k":"review","t":"Unit Review and Fluency Practice","after":6,"d":1},{"k":"assess","t":"Performance Task and Unit Assessment","after":6,"d":1},{"k":"summ","t":"Summative Assessment","after":6,"d":1}]}];

  /* ---------- CCSS as the guide prints it -> the gradebook's codes ----------
     lbl is a short label for the planner card; or is the 2021 Oregon code
     (or codes) marks are kept under. Grade 1 codes have no Oregon grade 2
     equivalent and map to nothing. 2.MD.D.9 is split in Oregon between
     collecting measurement data (2.DR.A.1) and showing it (2.DR.B.2), so
     it lists both. */
  var CROSS = {
    "1.NBT.A.1": { lbl: "Count to 120", or: [] },
    "1.NBT.B.3": { lbl: "Compare two-digit numbers", or: [] },
    "1.NBT.C.4": { lbl: "Add within 100", or: [] },
    "1.NBT.C.6": { lbl: "Subtract multiples of 10", or: [] },
    "1.OA.A.2": { lbl: "Word problems with three addends", or: [] },
    "1.OA.C.6": { lbl: "Add and subtract within 20", or: [] },
    "2.OA.A.1": { lbl: "Add/subtract word problems to 100", or: ["2.OA.A.1"] },
    "2.OA.B.2": { lbl: "Fluency within 20", or: ["2.OA.B.2"] },
    "2.OA.C.3": { lbl: "Odd and even", or: ["2.OA.C.3"] },
    "2.OA.C.4": { lbl: "Arrays as repeated addition", or: ["2.OA.C.4"] },
    "2.NBT.A.1": { lbl: "Hundreds, tens, ones", or: ["2.NBT.A.1"] },
    "2.NBT.A.1.a": { lbl: "100 is a bundle of ten tens", or: ["2.NBT.A.1"] },
    "2.NBT.A.1.b": { lbl: "Hundreds: 100, 200 \u2026 900", or: ["2.NBT.A.1"] },
    "2.NBT.A.2": { lbl: "Count and skip-count to 1000", or: ["2.NBT.A.2"] },
    "2.NBT.A.3": { lbl: "Read/write numbers to 1000", or: ["2.NBT.A.3"] },
    "2.NBT.A.4": { lbl: "Compare 3-digit numbers", or: ["2.NBT.A.4"] },
    "2.NBT.B.5": { lbl: "Fluency within 100", or: ["2.NBT.B.5"] },
    "2.NBT.B.6": { lbl: "Add up to four 2-digit numbers", or: ["2.NBT.B.6"] },
    "2.NBT.B.7": { lbl: "Add/subtract within 1000", or: ["2.NBT.B.7"] },
    "2.NBT.B.8": { lbl: "Mentally 10/100 more or less", or: ["2.NBT.B.8"] },
    "2.NBT.B.9": { lbl: "Explain why strategies work", or: ["2.NBT.B.9"] },
    "2.MD.A.1": { lbl: "Measure with the right tool", or: ["2.GM.B.4"] },
    "2.MD.A.2": { lbl: "Measure in two units", or: ["2.GM.B.5"] },
    "2.MD.A.3": { lbl: "Estimate lengths", or: ["2.GM.B.6"] },
    "2.MD.A.4": { lbl: "Compare two lengths", or: ["2.GM.B.7"] },
    "2.MD.B.5": { lbl: "Length word problems", or: ["2.GM.C.8"] },
    "2.MD.B.6": { lbl: "Number line sums/differences", or: ["2.GM.C.9"] },
    "2.MD.C.7": { lbl: "Time to five minutes", or: ["2.GM.D.10"] },
    "2.MD.C.8": { lbl: "Money problems", or: ["2.GM.D.11"] },
    "2.MD.D.9": { lbl: "Measurement data on a line plot", or: ["2.DR.A.1", "2.DR.B.2"] },
    "2.MD.D.10": { lbl: "Picture and bar graphs", or: ["2.DR.B.2"] },
    "2.G.A.1": { lbl: "Shapes and attributes", or: ["2.GM.A.1"] },
    "2.G.A.2": { lbl: "Partition rectangles into squares", or: ["2.GM.A.2"] },
    "2.G.A.3": { lbl: "Equal parts of shapes", or: ["2.GM.A.3"] }
  };
  /* Oregon -> the CCSS code to show for it: the first CCSS code that maps
     to it alone, else the first that maps to it at all. */
  var SHOW = {};
  Object.keys(CROSS).forEach(function (c) {
    var or = CROSS[c].or;
    if (or.length === 1 && !SHOW[or[0]] && c.split(".").length === 3) SHOW[or[0]] = c;
  });
  Object.keys(CROSS).forEach(function (c) {
    CROSS[c].or.forEach(function (o) { if (!SHOW[o]) SHOW[o] = c; });
  });

  /* ---------- the sequence, flattened ----------
     FLAT is every day of the guide in order. Each step learns its unit, its
     place in FLAT, and how many guide days of its unit come before it. */
  var FLAT = [], BYUNIT = {}, cum = 0;
  UNITS.forEach(function (u) {
    BYUNIT[u.u] = u;
    u.start = cum;
    var inUnit = 0;
    u.steps.forEach(function (s) {
      s.u = u.u; s.i = FLAT.length; s.inUnit = inUnit;
      inUnit += s.d;
      FLAT.push(s);
    });
    cum += u.total;
  });
  var TOTAL = cum;

  var WORD = { diag: "Diagnostic", open: "Opener", probe: "Probe", review: "Review",
    assess: "Test", bench: "Benchmark", summ: "Summative" };

  function unit(n) { return BYUNIT[Number(n)] || null; }
  function posOf(s) {
    return s.k === "L" ? { unit: s.u, lesson: s.n } : { unit: s.u, lesson: s.after || 0, k: s.k };
  }
  /* the step a stored position points at, or null if the guide has none */
  function find(p) {
    if (!p) return null;
    var u = unit(p.unit);
    if (!u) return null;
    var k = p.k || "L";
    for (var i = 0; i < u.steps.length; i++) {
      var s = u.steps[i];
      if (s.k !== k) continue;
      if (k === "L" && s.n !== Number(p.lesson)) continue;
      return s;
    }
    return null;
  }
  /* The next day of the guide. A position the guide does not have (U1 L8,
     left over from the old ten-lessons-a-unit stepper) goes to the first
     day after it: the next lesson in the unit if there is one, otherwise
     the next unit's opener. null means "not ours": past Unit 12, the
     planner's own stepper carries on. */
  function next(p) {
    var s = find(p);
    if (s) return posOf(FLAT[s.i + 1] || s);
    if (!p || !unit(p.unit)) return null;
    var u = Number(p.unit), l = Number(p.lesson) || 0;
    for (var i = 0; i < FLAT.length; i++) {
      var f = FLAT[i];
      if (f.u > u || (f.u === u && f.k === "L" && f.n > l)) return posOf(f);
    }
    return posOf(FLAT[FLAT.length - 1]);
  }
  function prev(p) {
    var s = find(p);
    if (s) return posOf(FLAT[s.i - 1] || s);
    if (!p || !unit(p.unit)) return null;
    var u = Number(p.unit), l = Number(p.lesson) || 0, hit = null;
    for (var i = 0; i < FLAT.length; i++) {
      var f = FLAT[i];
      if (f.u < u || (f.u === u && f.k === "L" && f.n < l)) hit = f;
    }
    return posOf(hit || FLAT[0]);
  }
  /* the readout: "U2 · L3" for a lesson, as the planner always wrote it */
  function short(p) {
    if (!p) return "\u2014";
    var s = find(p);
    if (s && s.k === "bench") return "U" + s.u + " \u00b7 Benchmark " + s.n;
    if (p.k) return "U" + p.unit + " \u00b7 " + (WORD[p.k] || p.k);
    return "U" + p.unit + " \u00b7 L" + p.lesson;
  }
  /* "Lesson 2-3 · Read and Write Numbers to 1,000", or the day's own title */
  function name(s) {
    if (!s) return "";
    return s.k === "L" ? "Lesson " + s.u + "-" + s.n + " \u00b7 " + s.t : s.t;
  }
  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
  function lessonsOf(u, upTo) {
    var U = unit(u);
    return U ? U.steps.filter(function (s) { return s.k === "L" && (upTo == null || s.n <= upTo); }) : [];
  }
  /* CCSS codes a day works on. A lesson has its own; a review or a unit
     test covers the unit; a probe covers the lessons before it. */
  function ccss(s) {
    if (!s) return [];
    if (s.k === "L") return (s.std || []).slice();
    var from = s.k === "assess" || s.k === "review" ? lessonsOf(s.u)
      : s.k === "probe" ? lessonsOf(s.u, s.after) : [];
    return uniq([].concat.apply([], from.map(function (l) { return l.std || []; })));
  }
  function toOregon(c) { return CROSS[c] ? CROSS[c].or.slice() : []; }
  function oregon(s) { return uniq([].concat.apply([], ccss(s).map(toOregon))); }
  function unitOregon(u) {
    return uniq([].concat.apply([], lessonsOf(u).map(function (l) { return [].concat.apply([], (l.std || []).map(toOregon)); })));
  }
  function isPrior(c) { return /^1\./.test(c); }
  /* a unit whose every lesson is below grade 2 — Unit 1 */
  function priorUnit(u) {
    var L = lessonsOf(u);
    return L.length > 0 && L.every(function (l) { return (l.std || []).every(isPrior); });
  }
  function ccssFor(or) { return SHOW[or] || null; }
  /* The planner's Math, when it is following the guide. Checked by id and
     schema so a renamed curriculum still counts; `pacing: false` on the
     subject is the off switch. */
  function on(sb) { return !!(sb && sb.id === "math" && sb.schema === "ul" && sb.pacing !== false); }

  /* ---------- against a calendar ----------
     Given the school days that have a Math block, in order, where the guide
     puts each unit. A unit's budget is its whole "Time for Unit", flex days
     included, so a unit ends where the guide expects the next to start. */
  function plan(days) {
    var out = [], i = 0;
    UNITS.forEach(function (u) {
      var n = Math.round(u.total);
      out.push({ u: u.u, from: days[i] || null, to: days[Math.min(i + n, days.length) - 1] || null, short: i + n > days.length });
      i += n;
    });
    return out;
  }
  function unitOnDate(pl, iso) {
    for (var i = 0; i < pl.length; i++) if (pl[i].from && pl[i].to && iso >= pl[i].from && iso <= pl[i].to) return pl[i].u;
    return null;
  }

  var RP = window.RevealPacing = {
    VERSION: VERSION, UNITS: UNITS, FLAT: FLAT, TOTAL: TOTAL, CROSS: CROSS,
    unit: unit, find: find, next: next, prev: prev, posOf: posOf, short: short, name: name,
    ccss: ccss, oregon: oregon, toOregon: toOregon, unitOregon: unitOregon, ccssFor: ccssFor,
    isPrior: isPrior, priorUnit: priorUnit, on: on, plan: plan, unitOnDate: unitOnDate
  };

  /* ======================================================================
     BENCHMARK ADVANCE, GRADE 2 — the scope and sequence
     Source: "Grade 2 · Benchmark Advance Scope and Sequence" (© 2022
     Benchmark Education), pages 50–69: ten units of three weeks. It is a
     week-by-week document, so everything here is by week; it has no
     day-level objectives to offer. Text is as printed apart from the typos
     listed in HANDOFF.md under v60.

     The scope and sequence prints skill names, not standard codes. SKILL
     below matches each skill name to the 2019 Oregon ELA standard it is
     worded after ("Identify Main Topic and Key Details" is 2.RI.2) and is
     labelled as inferred wherever it is shown. Metacognitive and fix-up
     strategies are habits, not standards, and map to nothing. Word study
     (phonological awareness, phonics, high-frequency words) is mapped but
     kept out of "taught this day", because Phonics in the planner is ECRI.
     ====================================================================== */
  var BM_UNITS = 
[{"u":1,"title":"Plants and Animals in Their Habitats","eq":"How do living things get what they need to survive?","eu":["The world has many types of habitats, with different weather, seasons, animals, and plants.","Living things have different features that help them meet their needs in their habitat.","Reading about animal characters in literature can help us understand animals and their habitats."],"wordBank":["survive","habitat","season","weather"],"project":"Research a Habitat","weeks":[{"w":1,"reads":{"interactive":"The Frogs and the Well","accountable":"Life in the Ocean","wordStudy":"Meet Ranger Diaz"},"anchor":[{"kind":"Short Read 1","t":"Emperor Penguin Habitat"},{"kind":"Short Read 2","t":"Postcards from Alex"}],"practice":["The Changing Arctic"],"pa":["Oral Blending and Segmenting CVC Words","Substitute Medial Vowel Sounds"],"phonics":{"Primary Skill":"short vowels; one-syllable words; initial and final blends; consonant digraphs","Spiral Review":"consonant review"},"hfw":["a","can","and","come","are","for","big","go","has","I"],"fluency":"Expression—Characterization/Feelings","meta":["Metacognitive: Ask Questions","Metacognitive: Create Mental Images","Fix-Up: Reread to Clarify or Confirm Understanding"],"comp":["Identify Main Topic and Key Details","Explain How Images Contribute to and Clarify a Text","Recount Stories and Determine Their Central Message, Lesson, or Moral (Recount Stories)","Describe the Overall Structure of a Story"],"vocab":["Use Context as a Clue to Determine Word Meaning"],"words":{"ga":["survive","paddle"],"ds":["habitats","burrow"]},"writing":"Write to a Text-Based Prompt: Informative/Explanatory Essay","grammar":["Produce Complete Simple Sentences","Use an Apostrophe to Form Contractions and Possessives"]},{"w":2,"reads":{"interactive":"The Venus Flytrap","accountable":"Nolan and the Lionfish","wordStudy":"Bats, Bats, Bat!"},"anchor":[{"kind":"Extended Read 1","t":"Habitats Around the World"}],"practice":["A Day in the Rainforest"],"pa":["Oral Blending and Segmenting CVC Words","Blend and Segment Multisyllabic Words by a Syllable"],"phonics":{"Primary Skill":"closed syllable patterns; open syllable patterns","Secondary Skill":"initial 3-letter blends","Spiral Review":"initial and final blends; consonant digraphs"},"hfw":["have","is","jump","my","one","put","the","want","what","you"],"fluency":"Confirm or Correct Word Recognition and Understanding","meta":["Metacognitive: Ask Questions"],"comp":["Identify Main Topic and Key Details","Explain How Images Contribute to and Clarify a Text","Compare and Contrast the Most Important Points in Two Texts on the Same Topic"],"vocab":["Use Context as a Clue to Determine Word Meaning"],"words":{"ga":["unique","shallow"],"ds":["nature","tropical"]},"writing":"Write to a Text-Based Prompt: Informative/Explanatory Essay","grammar":["Produce Complete Simple Sentences (Subjects and Predicates)","Capitalize Geographic Names"]},{"w":3,"reads":{"interactive":"Rain, Rain, Go Away!","accountable":"All About Squirrels","wordStudy":"My Desert Blog"},"anchor":[{"kind":"Extended Read 2","t":"Filiberto in the Valley"},{"kind":"Unit Poem","t":"The Bat"}],"practice":["Sunnyside Animal Clinic"],"pa":["Oral Blending and Segmenting Words with Initial Blends","Delete Sounds in a Blend"],"phonics":{"Primary Skill":"long a vowel team syllable patterns (a, ai, ea, ay, a_e)","Spiral Review":"long vowels (one-syllable VCe)"},"hfw":["he","like","little","no","of","saw","this","to","we","with"],"fluency":null,"meta":["Metacognitive: Create Mental Images","Fix-Up: Read On to Clarify or Confirm Understanding"],"comp":["Recount Stories and Determine Their Central Message, Lesson, or Moral (Recount Stories)","Describe the Overall Structure of a Story","Introduce Poetry"],"vocab":["Use Context as a Clue to Determine Word Meaning"],"words":{"ga":["take advantage of","domestic","presence"],"ds":["clinic"]},"writing":"Write to a Text-Based Prompt: Informative/Explanatory Essay","grammar":["Form and Use Irregular Past Tense Verbs"]}]},
{"u":2,"title":"Characters Facing Challenges","eq":"What can we learn when we face problems?","eu":["All stories, whether traditional or modern, have characters who face problems.","Characters in stories face problems caused by internal and external challenges.","Readers can build knowledge about solving problems in the real world by looking at how characters face challenges in stories."],"wordBank":["challenge","internal","external","solution"],"project":"Explore Challenges in a Tale","weeks":[{"w":1,"reads":{"interactive":"Lion and Mouse","accountable":"Willow and Toad","wordStudy":"King Midas"},"anchor":[{"kind":"Short Read 1","t":"The Foolish Milkmaid"},{"kind":"Short Read 2","t":"The Daydreaming Sprinter"}],"practice":["The Super School Bake-Off"],"pa":["Oral Blending and Segmenting Words with Final Blends","Delete Final Sound in a Blend"],"phonics":{"Primary Skill":"long o vowel team syllable patterns (o, oa, ow, oe, o_e)","Spiral Review":"long a vowel team syllable patterns"},"hfw":["here","look","me","play","said","see","she","try","about","because"],"fluency":"Speed/Pacing—Fast","meta":["Metacognitive: Draw Inferences","Metacognitive: Make Connections","Fix-Up: Stop and Think About the Author’s Purpose"],"comp":["Recount Stories and Determine Their Central Message, Lesson, or Moral (Determine Central Message)","Describe How Characters Respond to Major Events and Challenges","Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, and Plot","Recount Stories and Determine Their Central Message, Lesson, or Moral (Recount Stories)"],"vocab":["Distinguish Shades of Meaning Among Closely Related Verbs"],"words":{"ga":["dash","jealous","foolish"],"ds":["disqualification"]},"writing":"Write to a Text-Based Prompt: Opinion Essay","grammar":["Form and Use Irregular Plural Nouns","Adjectives and Adverbs"]},{"w":2,"reads":{"interactive":"Why Monkeys Live in Trees","accountable":"Jack and the Bean Tree","wordStudy":"Bee and Daisy"},"anchor":[{"kind":"Extended Read 1","t":"Yeh-Shen"}],"practice":["Nora Saves the Day"],"pa":["Oral Blending and Segmenting Words with Initial Blends","Delete Initial Sound in a Blend"],"phonics":{"Primary Skill":"long e vowel team syllable patterns (e, e_e, ee, ea, y, ey, ie)","Secondary Skill":"plurals -s, -es","Spiral Review":"long o vowel team syllable patterns"},"hfw":["after","before","call","do","earth","father","give","her","know","large"],"fluency":"Pausing—Short Pauses","meta":["Metacognitive: Draw Inferences"],"comp":["Recount Stories and Determine Their Central Message, Lesson, or Moral (Determine Central Message)","Describe How Characters Respond to Major Events and Challenges","Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, and Plot","Recount Stories and Determine Their Central Message, Lesson, or Moral (Recount Stories)"],"vocab":["Distinguish Shades of Meaning Among Closely Related Verbs"],"words":{"ga":["crept","hardworking","announced","exclaimed"],"ds":[]},"writing":"Write to a Text-Based Prompt: Opinion Essay","grammar":["Use Collective Nouns","Irregular Plural Nouns"]},{"w":3,"reads":{"interactive":"Mice on Ice","accountable":"Why Sun and Moon Live in the Sky","wordStudy":"Firefly Tricks Spider"},"anchor":[{"kind":"Extended Read 2","t":"Great Girls’ Contest"},{"kind":"Unit Poem","t":"Since Hanna Moved Away"}],"practice":["The Annual Birdhouse Competition"],"pa":["Substitute Sounds (parts of blends in the final position)","Oral Blending and Segmenting Words with Final Blends"],"phonics":{"Primary Skill":"long i vowel team syllable patterns (i, ie, y, igh, i_e)","Spiral Review":"long e vowel team syllable patterns"},"hfw":["good","many","near","off","people","right","that","two","under","very"],"fluency":null,"meta":["Metacognitive: Make Connections","Fix-Up: Read Out Loud to Support Comprehension"],"comp":["Recount Stories and Determine Their Central Message, Lesson, or Moral (Determine Central Message)","Describe How Characters Respond to Major Events and Challenges","Read a Poem: Understand Figurative Language"],"vocab":["Distinguish Shades of Meaning Among Closely Related Verbs"],"words":{"ga":["clumsy","graceful","generous","accurate"],"ds":[]},"writing":"Write to a Text-Based Prompt: Opinion Essay","grammar":["Use Reflexive Pronouns"]}]},
{"u":3,"title":"Government at Work","eq":"Why do we need a government?","eu":["The U.S. Government provides laws and services to help protect the freedom and safety of the people.","People can contribute to their communities and their government in many different ways.","The United States can be represented by symbols and documents.","Historical fiction is a genre that bases its stories and characters on actual events and people from the past."],"wordBank":["services","community","symbols","protect"],"project":"Government Service Fact Sheet","weeks":[{"w":1,"reads":{"interactive":"Rules and Laws","accountable":"Our Flag","wordStudy":"Vote For Lulu"},"anchor":[{"kind":"Short Read 1","t":"Smoke Jumpers"},{"kind":"Short Read 2","t":"Can You Sew a Flag, Betsy Ross?"}],"practice":["FEMA: Helping the Community"],"pa":["Substitute Medial Vowel Sounds","Add Initial and Final Sounds"],"phonics":{"Primary Skill":"long u vowel team syllable patterns (u, ew, ue, u_e)","Spiral Review":"long i vowel team syllable patterns"},"hfw":["again","below","carry","does","eight","find","house","laugh","mother","school"],"fluency":"Inflection/Intonation—Pitch","meta":["Metacognitive: Distinguish Between Important and Unimportant Information","Metacognitive: Summarize and Synthesize","Fix-Up: Read More Slowly and Think About the Words"],"comp":["Identify Main Topic and Key Details","Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, or Plot","Acknowledge Differences in the Points of View of Characters"],"vocab":["Use Context as a Clue to Determine the Meaning of Words and Phrases"],"words":{"ga":["symbol","gear","strength"],"ds":["citizens"]},"writing":"Process Writing: Informative/Explanatory Essay","grammar":["Form and Use the Past Tense of Irregular Verbs","Use Collective Nouns"]},{"w":2,"reads":{"interactive":"A Special Lady","accountable":"Martin Luther King Jr.","wordStudy":"Community Workers"},"anchor":[{"kind":"Extended Read 1","t":"Our Government’s Laws"}],"practice":["My Mom the Safety Monitor"],"pa":["Substitute Medial Vowel Sounds","Substitute Initial and Final Sounds"],"phonics":{"Primary Skill":"r-controlled /är/ syllable patterns","Secondary Skill":"inflectional endings -ed, -ing (no spelling change)","Spiral Review":"long u vowel team syllable pattern"},"hfw":["move","never","once","round","small","their","too","walk","where","year"],"fluency":"Phrasing—Units of Meaning in Complex Sentences","meta":["Metacognitive: Distinguish Between Important and Unimportant Information"],"comp":["Identify Main Topic and Key Details","Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Compare and Contrast Key Points in Two Texts on the Same Topic to Make Connections Across Texts"],"vocab":["Use Context as a Clue to Determine the Meaning of Words and Phrases"],"words":{"ga":["allowed","programs","local","ticket"],"ds":[]},"writing":"Process Writing: Informative/Explanatory Essay","grammar":["Form and Use the Past Tense of Irregular Verbs","Use Collective Nouns"]},{"w":3,"reads":{"interactive":"The New Guy","accountable":"Here Comes the Mail","wordStudy":"The President’s House"},"anchor":[{"kind":"Extended Read 2","t":"Getting a Message to General Washington"},{"kind":"Unit Poem","t":"Words Like Freedom"}],"practice":["Colonel Tye"],"pa":["Blend and Segment Multisyllabic Words by Syllable","Delete Initial and Final Sounds"],"phonics":{"Primary Skill":"r-controlled /ûr/ syllable patterns (er, ir, ur)","Spiral Review":"r-controlled /är/ syllable patterns"},"hfw":["all","away","better","by","change","done","even","found","learn","only"],"fluency":null,"meta":["Metacognitive: Summarize and Synthesize","Fix-Up: Reread to Clarify or Confirm Understanding"],"comp":["Acknowledge Differences in the Points of View of Characters","Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, or Plot","Read a Poem: Understand Imagery"],"vocab":["Use Context as a Clue to Determine the Meaning of Words and Phrases"],"words":{"ga":["eager","urgent","puzzled","enemy"],"ds":[]},"writing":"Process Writing: Informative/Explanatory Essay","grammar":["Use Reflexive Pronouns"]}]},
{"u":4,"title":"Many Characters, Many Points of View","eq":"How can a story change depending on who tells it?","eu":["Folktales are traditional stories that often teach a lesson and are part of many cultures.","Every story is narrated from a unique point of view and that point of view shapes the story.","We can learn valuable lessons about understanding others, working together, and problem-solving through stories."],"wordBank":["character","narrator","perspective","lesson"],"project":"Reimagine a Folktale","weeks":[{"w":1,"reads":{"interactive":"The Perfect Pet","accountable":"How Cow Got Its Horns","wordStudy":"Fox Makes Friends"},"anchor":[{"kind":"Short Read 1","t":"The Blind Men and the Elephant"},{"kind":"Short Read 2","t":"How the Beetle Got Its Gorgeous Coat"}],"practice":["The One Turnip Garden"],"pa":["Delete Initial Sound in a Blend","Add Initial and Final Sounds"],"phonics":{"Primary Skill":"r-controlled /ôr/ syllable patterns (or, oar, ore)","Spiral Review":"r-controlled /ûr/ syllable patterns (er, ir, ur)"},"hfw":["long","now","our","some","them","through","upon","was","when","work"],"fluency":"Expression—Anticipation/Mood","meta":["Metacognitive: Ask Questions About Characters and Events","Metacognitive: Create Mental Images of Characters and Events","Fix-Up: Read On to Clarify or Confirm Understanding"],"comp":["Describe the Overall Structure of a Story","Acknowledge Differences in the Points of View of Characters","Describe How Characters Respond to Major Events and Challenges","Recount Stories and Determine Their Central Message, Lesson, or Moral (Determine Central Message)"],"vocab":["Describe How Words and Phrases Supply Meaning in a Story"],"words":{"ga":["cultures","interrupted","admired","boasted"],"ds":[]},"writing":"Write to a Text-Based Prompt: Fictional Diary Entry","grammar":["Use Reflexive Pronouns","Use Adjectives and Adverbs"]},{"w":2,"reads":{"interactive":"The Shoemakers and the Elves","accountable":"City Mouse and Country Mouse","wordStudy":"Fearless Jess"},"anchor":[{"kind":"Extended Read 1","t":"Stone Soup"}],"practice":["Clean Water"],"pa":["Substitute Medial Vowel Sounds","Substitute Initial and Final Sounds"],"phonics":{"Primary Skill":"r-controlled /îr/ syllable patterns (ear, eer, ere)","Secondary Skill":"contractions ‘t, ‘s","Spiral Review":"r-controlled /ôr/ syllable patterns (or, oar, ore)"},"hfw":["always","any","blue","buy","city","draw","four","great","how","live"],"fluency":"Speed/Pacing—Slow","meta":["Metacognitive: Ask Questions About Characters and Events"],"comp":["Describe the Overall Structure of a Story","Acknowledge Differences in the Points of View of Characters","Describe How Characters Respond to Major Events and Challenges","Recount Stories and Determine Their Central Message, Lesson, or Moral (Determine Central Message)"],"vocab":["Describe How Words and Phrases Supply Meaning in a Story"],"words":{"ga":["originated","spare","villager","smacked"],"ds":[]},"writing":"Write to a Text-Based Prompt: Fictional Diary Entry","grammar":["Use Adjectives and Adverbs"]},{"w":3,"reads":{"interactive":"Pecos Bill","accountable":"The Three Bears","wordStudy":"Far from Earth"},"anchor":[{"kind":"Extended Read 2","t":"The Stone Garden"},{"kind":"Unit Poem","t":"Read to Me"}],"practice":["A Helping Hand"],"pa":["Substitute Medial Vowel Sounds","Substitute Initial and Final Sounds"],"phonics":{"Primary Skill":"r-controlled /âr/ syllable patterns (air, are, ear, ere)","Spiral Review":"r-controlled /îr/ syllable patterns (ear, eer, ere)"},"hfw":["another","boy","could","every","far","from","hurt","over","out","these"],"fluency":null,"meta":["Metacognitive: Create Mental Images of Characters and Events","Fix-Up: Stop and Think About the Author’s Purpose"],"comp":["Acknowledge Differences in the Points of View of Characters","Compare Two Versions of the Same Story","Read a Poem: Understand Imagery"],"vocab":["Describe How Words and Phrases Supply Meaning in a Story"],"words":{"ga":["proud","tidy","world-class","indeed"],"ds":[]},"writing":"Write to a Text-Based Prompt: Fictional Diary Entry","grammar":["Use Reflexive Pronouns","Use Irregular Past Tense Verbs"]}]},
{"u":5,"title":"Solving Problems Through Technology","eq":"Where do ideas for inventions come from?","eu":["People are constantly inventing new things to solve problems.","Inventions are often inspired by nature.","Anyone can be an inventor."],"wordBank":["invention","engineer","problem","solve","solution"],"project":"Research an Invention, Part 1","weeks":[{"w":1,"reads":{"interactive":"Found!","accountable":"Kid Inventors","wordStudy":"A Cool Solution"},"anchor":[{"kind":"Short Read 1","t":"A Woman with a Vision"},{"kind":"Short Read 2","t":"A Lucky Accident"}],"practice":["Reading with Your Fingertips"],"pa":["Blend and Segment Multisyllabic Words by Syllable","Add Initial and Final Sounds"],"phonics":{"Primary Skill":"VCe syllable patterns; consonant -le syllable patterns","Spiral Review":"r-controlled /âr/ syllable patterns (air, are, ear, ere)"},"hfw":["answer","brown","country","start","then","there","wash","went","who","your"],"fluency":"Pausing—Full Stops","meta":["Metacognitive: Draw Inferences","Fix-Up: Read Out Loud to Support Comprehension"],"comp":["Identify Main Topic and Key Details","Identify Main Purpose of a Text (Author’s Purpose)","Explain How Images Contribute to and Clarify a Text","Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Distinguish Between Important and Unimportant Information"],"vocab":["Determine the Meaning of Compound Words"],"words":{"ga":["vision","device","observation","disabilities"],"ds":[]},"writing":"Process Writing: Opinion Essay","grammar":["Use an Apostrophe to Form Possessives","Use Irregular Past Tense Verbs"]},{"w":2,"reads":{"interactive":"A Noisy Problem","accountable":"The Curious Boy","wordStudy":"Satellites"},"anchor":[{"kind":"Extended Read 1","t":"Two Famous Inventors"}],"practice":["When I Grow Up"],"pa":["Delete Final Sound in a Blend","Delete Initial and Final Sounds"],"phonics":{"Primary Skill":"/oi/ vowel team syllable patterns (oi, oy)","Secondary Skill":"inflectional ending -es (with changing y to i)","Spiral Review":"VCe syllable patterns"},"hfw":["above","began","different","enough","few","grow","they","were","which","why"],"fluency":"Expression—Anticipation/Mood","meta":["Metacognitive: Draw Inferences"],"comp":["Identify Main Topic and Key Details","Identify Main Purpose of a Text (Author’s Purpose)","Explain How Images Contribute to and Clarify a Text","Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps"],"vocab":["Determine the Meaning of Compound Words"],"words":{"ga":["improvements","opportunities","inventor","benefited"],"ds":[]},"writing":"Process Writing: Opinion Essay","grammar":["Capitalize Holidays, Product Names, and Geographical Names","Produce Complete Simple Sentences"]},{"w":3,"reads":{"interactive":"Keeping Food Cold","accountable":"Robots","wordStudy":"Music for Joy"},"anchor":[{"kind":"Extended Read 2","t":"Robots Go to School"},{"kind":"Unit Poem","t":"Eletelephony"}],"practice":["Welcome to Our School"],"pa":["Delete Initial Sound in a Blend","Delete Initial and Final Sounds"],"phonics":{"Primary Skill":"/ou/ vowel team syllable patterns (ou, ow)","Spiral Review":"/oi/ vowel team syllable patterns (oi, oy)"},"hfw":["follow","girl","head","idea","kind","leave","might","next","often","paper"],"fluency":null,"meta":["Metacognitive: Distinguish Between Important and Unimportant Information","Fix-Up: Read More Slowly and Think About the Words"],"comp":["Identify Main Purpose of a Text (Author’s Purpose)","Compare and Contrast the Most Important Points in Two Texts on the Same Topic","Read a Poem: Understand Rhyme and Regular Beats"],"vocab":["Determine the Meaning of Words and Phrases in a Text"],"words":{"ga":["limitations","maneuver","experience","signal"],"ds":[]},"writing":"Process Writing: Opinion Essay","grammar":["Use an Apostrophe to Form Possessives","Capitalize Holidays, Product Names, and Geographical Names","Produce Complete Simple Sentences"]}]},
{"u":6,"title":"Tales to Live By","eq":"What can different cultures teach us?","eu":["Storytelling is a very old tradition shared by many cultures around the world.","People tell stories to entertain, educate, and share ideas.","There are common themes, or central messages, that can be found in folktales across many cultures.","Readers can build knowledge and understanding about different cultures and traditions, and learn valuable lessons, from folktales."],"wordBank":["cultures","folktale","storytelling","message"],"project":"Research an Invention, Part 2","weeks":[{"w":1,"reads":{"interactive":"The Brothers Grimm","accountable":"Mercury and the Ax","wordStudy":"Hansel and Gretel"},"anchor":[{"kind":"Short Read 1","t":"The Village of the Moon Rain"},{"kind":"Short Read 2","t":"The Huemul Egg"}],"practice":["The Rabbit and the Coyote"],"pa":["Delete Final Sound in a Blend","Delete Initial and Final Sounds"],"phonics":{"Primary Skill":"/oo/ vowel team syllable patterns (oo, ui, ew, ue, u, ou, oe, u_e)","Spiral Review":"/ou/ vowel team syllable patterns (ou, ow)"},"hfw":["point","river","second","song","think","three","until","watch","white","young"],"fluency":"Inflection/Intonation—Pitch","meta":["Metacognitive: Summarize and Synthesize","Metacognitive: Make Connections","Fix-Up: Reread to Clarify or Confirm Understanding"],"comp":["Ask and Answer Questions to Demonstrate Understanding of Key Details","Recount Stories and Determine Their Central Message, Lesson, or Moral (Determine Central Message)","Acknowledge Differences in the Points of View of Characters","Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, or Plot"],"vocab":["Identify Real-Life Connections Between Words and Their Uses"],"words":{"ga":["ancestors","disappear","stumbled","rudely"],"ds":[]},"writing":"Process Writing: Narrative Fiction","grammar":["Produce, Expand, and Rearrange Complete Compound Sentences"]},{"w":2,"reads":{"interactive":"The Boy Who Cried Wolf","accountable":"The Many Tales of Red Riding Hood","wordStudy":"Stone Soup"},"anchor":[{"kind":"Extended Read 1","t":"A Foxy Garden"}],"practice":["How Tiger Got His Stripes"],"pa":["Delete Initial and Final Sounds","Delete Initial Sound in a Blend"],"phonics":{"Primary Skill":"/oo/ vowel team syllable patterns (oo, u)","Secondary Skill":"homophones","Spiral Review":"/oo/ vowel team syllable patterns (oo, ui, ew, ue, u, ou, oe, u_e)"},"hfw":["add","between","close","example","food","group","hear","home","left","mountain"],"fluency":"Expression—Dramatic Expression","meta":["Metacognitive: Make Connections"],"comp":["Ask and Answer Questions to Demonstrate Understanding of Key Details","Recount Stories and Determine Their Central Message, Lesson, or Moral (Determine Central Message)","Acknowledge Differences in the Points of View of Characters","Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, or Plot"],"vocab":["Identify Real-Life Connections Between Words and Their Uses"],"words":{"ga":["wise","selfish","tricked","agreed"],"ds":[]},"writing":"Process Writing: Narrative Fiction","grammar":["Choose Between Adjectives and Adverbs"]},{"w":3,"reads":{"interactive":"Rumpelstiltskin","accountable":"No Small Trick","wordStudy":"The Legend of the Talking Feather"},"anchor":[{"kind":"Extended Read 2","t":"Why the Sky Is Far Away"},{"kind":"Unit Poem","t":"Be Glad Your Nose Is on Your Face"}],"practice":["The First Strawberries"],"pa":["Substitute Sounds (parts of blends in the final position)","Substitute Initial, Medial, and Final Sounds"],"phonics":{"Primary Skill":"/ô/ vowel teams syllable patterns ((w)a, al, aw, au)","Spiral Review":"consonant -le syllable pattern"},"hfw":["music","night","old","picture","sentence","spell","thought","together","while","world"],"fluency":null,"meta":["Metacognitive: Summarize and Synthesize","Fix-Up: Read On to Clarify or Confirm Understanding"],"comp":["Recount Stories and Determine Their Central Message, Lesson, or Moral (Determine Central Message)","Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, or Plot","Read a Poem: Understand Alliteration and Humor"],"vocab":["Identify Real-Life Connections Between Words and Their Uses"],"words":{"ga":["concealed","scrumptious","floated","angry"],"ds":[]},"writing":"Process Writing: Narrative Fiction","grammar":["Produce, Expand, and Rearrange Complete Compound Sentences","Choose Between Adjectives and Adverbs"]}]},
{"u":7,"title":"Investigating the Past","eq":"How does understanding the past shape the future?","eu":["Primary sources include firsthand accounts, photographs, writings, maps, and artifacts.","Primary sources help people learn about history and understand what life was like in the past.","People search for artifacts and fossils in order to better understand the past.","Understanding and learning from the past helps people better plan for the future."],"wordBank":["artifacts","past","firsthand account","primary sources"],"project":"Research a History Topic, Part 1","weeks":[{"w":1,"reads":{"interactive":"The Wright Brothers Take Off!","accountable":"My Freedom Diary","wordStudy":"The Baseball"},"anchor":[{"kind":"Short Read 1","t":"The Oregon Trail"},{"kind":"Short Read 2","t":"Ranch Flyer"}],"practice":["Road Trip with My Dad"],"pa":["Blend and Segment Multisyllabic Words by Syllable","Add Initial and Final Sounds"],"phonics":{"Primary Skill":"compound words; silent letters (wr, kn, gn)","Spiral Review":"closed syllable patterns"},"hfw":["air","along","begin","children","important","letter","open","own","sound","talk"],"fluency":"Confirm or Correct Word Recognition and Understanding","meta":["Metacognitive: Apply Metacognitive and Fix-Up Strategies","Fix-Up: Stop and Think About the Author’s Purpose"],"comp":["Identify Main Topic and Key Details","Use Text Features to Locate Key Facts or Information","Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Explain How Images Contribute to and Clarify a Text"],"vocab":["Distinguish Shades of Meaning Among Related Adjectives"],"words":{"ga":["exhausted","supplies","minute","amazing"],"ds":[]},"writing":"Process Writing: Narrative Nonfiction Letter","grammar":["Use Commas in Greetings and Closings of Letters"]},{"w":2,"reads":{"interactive":"A Letter to the City","accountable":"Family Album","wordStudy":"Sacagawea"},"anchor":[{"kind":"Extended Read 1","t":"Primary Sources"}],"practice":["Pen Pals from the Past and Present"],"pa":["Substitute Sounds (parts of blends in the final position)","Substitute Initial, Medial, and Final Sounds"],"phonics":{"Primary Skill":"inflectional endings with spelling changes (drop final -e, double final consonant)","Secondary Skill":"contractions ’ll, ’ve, ’m","Spiral Review":"/ô/ vowel team syllable patterns"},"hfw":["almost","animal","around","body","color","eye","form","high","light","story"],"fluency":"Speed/Pacing—Varied","meta":["Metacognitive: Apply Metacognitive and Fix-Up Strategies"],"comp":["Identify Main Topic and Key Details","Use Text Features to Locate Key Facts or Information","Explain How Images Contribute to and Clarify a Text"],"vocab":["Distinguish Shades of Meaning Among Related Adjectives"],"words":{"ga":["exist","past","event","letters"],"ds":[]},"writing":"Process Writing: Narrative Nonfiction Letter","grammar":["Use an Apostrophe to Form Contractions","Produce Complete Simple Sentences"]},{"w":3,"reads":{"interactive":"How to Make a Time Capsule","accountable":"A Desert Discovery","wordStudy":"The History Lady"},"anchor":[{"kind":"Extended Read 2","t":"A Dinosaur Named SUE"},{"kind":"Unit Poem","t":"Crazy Boys"}],"practice":["I Met SUE"],"pa":["Delete Final Sound in a Blend","Delete Initial and Final Sounds"],"phonics":{"Primary Skill":"related root words","Spiral Review":"open syllable pattern"},"hfw":["across","become","complete","during","happened","hundred","problem","toward","study","wind"],"fluency":null,"meta":["Metacognitive: Apply Metacognitive and Fix-Up Strategies","Fix-Up: Read Out Loud to Support Comprehension"],"comp":["Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Explain How Images Contribute to and Clarify a Text","Read a Poem: Understand Figurative Language and Imagery"],"vocab":["Distinguish Shades of Meaning Among Related Adjectives"],"words":{"ga":["gigantic","skillful"],"ds":["museum","exhibit"]},"writing":"Process Writing: Narrative Nonfiction Letter","grammar":["Use an Apostrophe to Form Contractions","Compare Formal and Informal Uses of English"]}]},
{"u":8,"title":"Wind and Water Change Earth","eq":"How do we react to changes in nature?","eu":["Wind and water cause weathering and erosion, changing the shape of land.","Changes can happen slowly, over a long time period, or quickly.","Human activity can cause changes to Earth’s surface that affect all living things.","Scientists record weather patterns to make predictions which can help people prepare for severe weather."],"wordBank":["force","damage","wear away","storm"],"project":"Research a History Topic, Part 2","weeks":[{"w":1,"reads":{"interactive":"Dust Storm!","accountable":"The Big Blizzard","wordStudy":"Sam Kent’s Journal"},"anchor":[{"kind":"Short Read 1","t":"Tornado!"},{"kind":"Short Read 2","t":"Water’s Awesome Wonder"}],"practice":["Hurricane Days"],"pa":["Substitute Medial Vowel Sounds","Substitute Initial and Final Sounds"],"phonics":{"Primary Skill":"irregular plural nouns","Spiral Review":"r-controlled vowel syllables"},"hfw":["against","certain","door","early","field","heard","knew","listen","morning","several"],"fluency":"Inflection/Intonation—Volume","meta":["Metacognitive: Apply Metacognitive and Fix-Up Strategies","Fix-Up: Read More Slowly and Think About the Words"],"comp":["Explain How Images Contribute to and Clarify a Text","Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Identify Main Purpose of a Text","Analyze How the Author’s Reasons Support Specific Points in a Text"],"vocab":["Use Context Clues to Determine Word Meaning"],"words":{"ga":["flowed","mighty","rises","warning"],"ds":[]},"writing":"Process Writing: Research Report","grammar":["Use Collective Nouns"]},{"w":2,"reads":{"interactive":"Our Sandcastles","accountable":"My Beach","wordStudy":"Mudslide"},"anchor":[{"kind":"Extended Read 1","t":"Earth’s Changes"}],"practice":["Dust Storm"],"pa":["Substitute Sounds (parts of blends in the final position)","Substitute Initial, Medial, and Final Sounds"],"phonics":{"Primary Skill":"suffixes -er, -or endings","Secondary Skill":"homographs","Spiral Review":"possessives"},"hfw":["area","ever","hours","measure","notice","order","piece","short","today","true"],"fluency":"Confirm or Correct Word Recognition and Understanding","meta":["Metacognitive: Apply Metacognitive and Fix-Up Strategies"],"comp":["Explain How Images Contribute to and Clarify a Text","Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Identify Main Purpose of a Text","Compare and Contrast the Most Important Points in Two Texts on the Same Topic"],"vocab":["Use Dictionaries and Glossaries to Determine Word Meaning"],"words":{"ga":["rushing","bits","breeze","lessen"],"ds":[]},"writing":"Process Writing: Research Report","grammar":["Compare Formal and Informal Uses of English; Understand Formal Uses of English","Capitalize Geographic Names"]},{"w":3,"reads":{"interactive":"The Contest","accountable":"Let’s Debate","wordStudy":"Earth’s Changing Mountains"},"anchor":[{"kind":"Extended Read 2","t":"Naples Daily Tidings"},{"kind":"Unit Poem","t":"Weather"}],"practice":["Avalanche!"],"pa":["Blend and Segment Multisyllabic Words by Syllable","Add Initial and Final Sounds"],"phonics":{"Primary Skill":"comparative and superlative suffixes -er, -est","Spiral Review":"irregular plural nouns"},"hfw":["covered","cried","figure","horse","money","products","questions","since","usually","voice"],"fluency":null,"meta":["Metacognitive: Apply Metacognitive and Fix-Up Strategies","Fix-Up: Reread to Clarify or Confirm Understanding"],"comp":["Identify Main Purpose of a Text","Analyze How the Author’s Reasons Support Specific Points in a Text"],"vocab":["Use Context Clues to Determine Word Meaning"],"words":{"ga":["banks","damage","heavy","waist deep"],"ds":[]},"writing":"Process Writing: Research Report","grammar":["Use Commas in Greeting and Closing"]}]},
{"u":9,"title":"Buyers and Sellers","eq":"How do the goods we make, buy, and sell connect us?","eu":["Goods are items that are made, bought, and sold.","People use natural resources to make, or produce, goods.","People make choices about what goods to buy based on their needs and wants.","Producers, buyers, and sellers are all connected."],"wordBank":["produce/producer","goods","resources","choice"],"project":"Research How a Good Is Made and Sold, Part 1","weeks":[{"w":1,"reads":{"interactive":"Allowance: For and Against","accountable":"A Baker’s Dozen","wordStudy":"Trading This for That"},"anchor":[{"kind":"Short Read 1","t":"From Tree to Baseball Bat"},{"kind":"Short Read 2","t":"Goat and Bear in Business"}],"practice":["The History of Cars"],"pa":["Substitute Initial and Final Sounds","Substitute Medial Vowel Sounds"],"phonics":{"Primary Skill":"suffixes -y, -ly","Spiral Review":"inflectional endings with spelling changes"},"hfw":["able","behind","carefully","common","easy","fact","remember","sure","vowel","whole"],"fluency":"Inflection/Intonation—Stress","meta":["Metacognitive: Apply Strategies","Fix-Up: Read On to Clarify or Confirm Understanding"],"comp":["Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Explain How Images Contribute to and Clarify a Text","Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, or Plot","Describe How Characters Respond to Major Events and Challenges"],"vocab":["Determine the Meaning of Compound Words"],"words":{"ga":["shipped","weigh","purchased","business"],"ds":[]},"writing":"Multimedia Presentation","grammar":["Use Adjectives and Adverbs"]},{"w":2,"reads":{"interactive":"Alissa’s Tag Sale","accountable":"Peanut Butter","wordStudy":"Zollipops"},"anchor":[{"kind":"Extended Read 1","t":"From Pine Tree to Pizza Box"}],"practice":["Reduce, Reuse, Recycle"],"pa":["Add Initial, Final Sounds","Blend and Segment Multisyllabic Words by Syllable"],"phonics":{"Primary Skill":"schwa","Secondary Skill":"irregular plural nouns","Spiral Review":"comparative and superlative suffixes -er, -est"},"hfw":["ago","government","half","machine","pair","quickly","scientist","thousand","understood","wait"],"fluency":"Phrasing—Units of Meaning in Complex Sentences","meta":["Metacognitive: Apply Strategies"],"comp":["Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Explain How Images Contribute to and Clarify a Text","Compare and Contrast the Most Important Points in Two Texts on the Same Topic"],"vocab":["Determine the Meaning of Words with Prefixes"],"words":{"ga":["protect","products","steps"],"ds":["natural resources"]},"writing":"Multimedia Presentation","grammar":["Use Irregular Past Tense Verbs"]},{"w":3,"reads":{"interactive":"Start a Business","accountable":"Picture It!","wordStudy":"Our Class Knows!"},"anchor":[{"kind":"Extended Read 2","t":"Cherokee Art Fair"},{"kind":"Unit Poem","t":"Turtle Soup"}],"practice":["Come Get Some Lemonade!"],"pa":["Substitute Initial and Final Sounds","Substitute Medial Vowel Sounds"],"phonics":{"Primary Skill":"silent letters /n/ gn, kn; /r/ wr; /m/ mb","Spiral Review":"schwa"},"hfw":["among","building","circle","decided","finally","heavy","include","nothing","special","wheel"],"fluency":null,"meta":["Metacognitive: Apply Strategies","Fix-Up: Stop and Think About the Author’s Purpose"],"comp":["Use Illustrations and Words to Demonstrate Understanding of Characters, Setting, or Plot","Describe How Characters Respond to Major Events and Challenges"],"vocab":["Determine the Meaning of Words and Phrases in a Text"],"words":{"ga":["annual","remembered","represent","greeted"],"ds":[]},"writing":"Multimedia Presentation","grammar":["Compare Formal and Informal Language"]}]},
{"u":10,"title":"States of Matter","eq":"How can matter change?","eu":["Everything is made up of matter.","Matter has three states: solid, liquid, or gas.","We can describe and sort matter by its physical properties.","Physical properties of matter (such as size, shape, and state) can change.","Some changes to matter can be reversed and others cannot."],"wordBank":["describe","state","change(s)","property/properties"],"project":"Research How a Good is Made and Sold, Part 2","weeks":[{"w":1,"reads":{"interactive":"Lemonade","accountable":"World’s Best Glass Art","wordStudy":"Up, Up and Away"},"anchor":[{"kind":"Short Read 1","t":"The Art of Origami"},{"kind":"Short Read 2","t":"Sand Sculpture"}],"practice":["Amazing Sea Creatures"],"pa":["Substitute Medial Vowel Sounds","Substitute Initial and Final Sounds"],"phonics":{"Primary Skill":"possessive nouns (singular and plural)","Spiral Review":"suffixes -y, -ly"},"hfw":["brought","contain","front","gave","inches","material","noun","ocean","strong","verb"],"fluency":"Confirm or Correct Word Recognition and Understanding","meta":["Metacognitive: Apply Strategies","Fix-Up: Read Out Loud to Support Comprehension"],"comp":["Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Explain How Images Contribute to and Clarify a Text","Ask and Answer Questions to Demonstrate Understanding of Key Details","Use Text Features to Locate Key Facts or Information"],"vocab":["Use a Known Root Word as a Clue to the Meaning of an Unknown Word"],"words":{"ga":["spread","create","stunning","smooth"],"ds":[]},"writing":"Process Writing: Acrostic Poem","grammar":["Produce Complete Simple Sentences"]},{"w":2,"reads":{"interactive":"Tyler’s Party","accountable":"Sand Becomes Glass!","wordStudy":"Water!"},"anchor":[{"kind":"Extended Read 1","t":"Matter Changes in Many Ways"}],"practice":["A Snowy Experiment"],"pa":["Blend and Segment Multisyllabic Words by Syllable","Add Initial and Final Sounds"],"phonics":{"Primary Skill":"prefixes un-, re-, dis-","Secondary Skill":"abbreviations","Spiral Review":"silent letters /n/ gn, kn; /r/ wr; /m/ mb"},"hfw":["built","correct","inside","island","language","oh","person","street","system","warm"],"fluency":"Inflection/Intonation—Volume","meta":["Metacognitive: Apply Strategies"],"comp":["Describe a Connection Between a Series of Events, Ideas, Concepts, or Steps","Explain How Images Contribute to and Clarify a Text","Ask and Answer Questions to Demonstrate Understanding of Key Details","Use Text Features to Locate Key Facts or Information"],"vocab":["Use a Known Root Word as a Clue to the Meaning of an Unknown Word"],"words":{"ga":["undergoes","properties","boils","transformed"],"ds":[]},"writing":"Process Writing: Acrostic Poem","grammar":["Produce Complete Compound Sentences"]},{"w":3,"reads":{"interactive":"Changing Liquids and Solids","accountable":"Beautiful Ice Cities","wordStudy":"New Planets"},"anchor":[{"kind":"Extended Read 2","t":"Crazy Horse Memorial"},{"kind":"Unit Poem","t":"It’s All Weather"}],"practice":["When Galaxies Collide"],"pa":["Blend and Segment Multisyllabic Words by Syllable","Add Initial and Final Sounds"],"phonics":{"Primary Skill":"suffixes -ful, -less","Spiral Review":"prefixes un-, re-, dis-"},"hfw":["dark","clear","explain","force","minutes","object","plane","power","produce","surface"],"fluency":null,"meta":["Metacognitive: Apply Strategies","Fix-Up: Read More Slowly and Think About the Words"],"comp":["Ask and Answer Questions to Demonstrate Understanding of Key Details","Use Text Features to Locate Key Facts or Information"],"vocab":["Identify Real-Life Connections Between Words and Their Uses"],"words":{"ga":["miles","models","measured"],"ds":["natural forces"]},"writing":"Reflect on Writing","grammar":["Irregular Plural Nouns"]}]}];
  /* [pattern, codes] — first match wins. "Ask and Answer Questions" is
     RL.1 or RI.1 by the kind of text, so it is decided per unit below. */
  var SKILL = [
    [/^Identify Main Topic and Key Details/, ["2.RI.2"]],
    [/^Explain How Images Contribute/, ["2.RI.7"]],
    [/^Recount Stories and Determine/, ["2.RL.2"]],
    [/^Describe the Overall Structure of a Story/, ["2.RL.5"]],
    [/^Compare and Contrast (?:the Most Important|Key) Points/, ["2.RI.9"]],
    [/^Introduce Poetry|^Read a Poem/, ["2.RL.4"]],
    [/^Describe How Characters Respond/, ["2.RL.3"]],
    [/^Use Illustrations and Words/, ["2.RL.7"]],
    [/^Acknowledge Differences in the Points of View/, ["2.RL.6"]],
    [/^Describe a Connection Between a Series/, ["2.RI.3"]],
    [/^Compare Two Versions of the Same Story/, ["2.RL.9"]],
    [/^Identify Main Purpose of a Text/, ["2.RI.6"]],
    [/^Use Text Features/, ["2.RI.5"]],
    [/^Analyze How the Author’s Reasons/, ["2.RI.8"]],
    [/^Distinguish Between Important and Unimportant/, []],
    [/^Use Context/, ["2.L.4a"]],
    [/^Distinguish Shades of Meaning/, ["2.L.5b"]],
    [/^Determine the Meaning of Compound Words/, ["2.L.4d"]],
    [/^Determine the Meaning of Words with Prefixes/, ["2.L.4b"]],
    [/^Use a Known Root Word/, ["2.L.4c"]],
    [/^Use Dictionaries and Glossaries/, ["2.L.4e"]],
    [/^Identify Real-Life Connections/, ["2.L.5a"]],
    [/^Describe How Words and Phrases Supply Meaning/, ["2.RL.4"]],
    [/^Determine the Meaning of Words and Phrases in a Text/, ["2.RI.4"]],
    [/Complete (?:Simple|Compound) Sentences/, ["2.L.1f"]],
    [/^Use an Apostrophe/, ["2.L.2c"]],
    [/^Capitalize/, ["2.L.2a"]],
    [/Irregular (?:Past Tense )?Verbs|Past Tense of Irregular Verbs/, ["2.L.1d"]],
    [/Irregular Plural Nouns/, ["2.L.1b"]],
    [/Adjectives and Adverbs/, ["2.L.1e"]],
    [/^Use Collective Nouns/, ["2.L.1a"]],
    [/^Use Reflexive Pronouns/, ["2.L.1c"]],
    [/^Use Commas in Greeting/, ["2.L.2b"]],
    [/^Compare Formal and Informal/, ["2.L.3a"]],
    [/Informative\/Explanatory/, ["2.W.2"]],
    [/Opinion Essay/, ["2.W.1"]],
    [/Fictional Diary Entry|Narrative Fiction|Narrative Nonfiction Letter/, ["2.W.3"]],
    [/Research Report/, ["2.W.7", "2.W.8"]],
    [/^Multimedia Presentation/, ["2.SL.5", "2.W.6"]],
    [/^Reflect on Writing/, ["2.W.5"]],
    [/Acrostic Poem/, []],
    [/^Confirm or Correct Word Recognition/, ["2.RF.4c"]],
    [/^(?:Expression|Inflection|Pausing|Phrasing|Speed)/, ["2.RF.4b"]]
  ];
  var ASK = { 6: ["2.RL.1"], 10: ["2.RI.1"] };
  function skillCodes(text, u) {
    if (!text) return [];
    if (/^Ask and Answer Questions/.test(text)) return (ASK[u] || ["2.RL.1", "2.RI.1"]).slice();
    for (var i = 0; i < SKILL.length; i++) if (SKILL[i][0].test(text)) return SKILL[i][1].slice();
    return [];
  }
  function paCodes(t) {
    return /^Substitute Medial Vowel/.test(t) ? ["2.RF.2a"]
      : /final position|^Delete Final Sound in a Blend/.test(t) ? ["2.RF.2b"] : ["2.RF.2"];
  }
  function phonicsCodes(t) {
    if (!t) return [];
    return /vowel team/.test(t) ? ["2.RF.3b"] : /short vowels/.test(t) ? ["2.RF.3a"]
      : /syllable patterns|VCe|-le/.test(t) ? ["2.RF.3c"]
      : /prefix|suffix|inflectional|comparative/.test(t) ? ["2.RF.3d"]
      : /silent letters|homophones|homographs|schwa/.test(t) ? ["2.RF.3e"] : ["2.RF.3"];
  }
  var BMU = {};
  BM_UNITS.forEach(function (u) { BMU[u.u] = u; });
  function bmUnit(n) { return BMU[Number(n)] || null; }
  function bmWeek(p) {
    var u = p && bmUnit(p.unit);
    if (!u) return null;
    for (var i = 0; i < u.weeks.length; i++) if (u.weeks[i].w === Number(p.week)) return u.weeks[i];
    return null;
  }
  /* The week's work, each item with the codes it maps to.
     reading: comprehension, vocabulary strategy, fluency.
     writing: the writing task and grammar.
     wordStudy: phonological awareness, phonics, high-frequency words. */
  function bmParts(u, w) {
    var r = [];
    (w.comp || []).forEach(function (t) { r.push({ kind: "Comprehension", t: t, codes: skillCodes(t, u) }); });
    (w.vocab || []).forEach(function (t) { r.push({ kind: "Vocabulary", t: t, codes: skillCodes(t, u) }); });
    if (w.fluency) r.push({ kind: "Fluency", t: w.fluency, codes: skillCodes(w.fluency, u) });
    var wr = [{ kind: "Writing", t: w.writing, codes: skillCodes(w.writing, u).concat(/^Process Writing/.test(w.writing) ? ["2.W.5"] : []) }];
    (w.grammar || []).forEach(function (t) { wr.push({ kind: "Grammar", t: t, codes: skillCodes(t, u) }); });
    var ws = [];
    (w.pa || []).forEach(function (t) { ws.push({ kind: "Phonological awareness", t: t, codes: paCodes(t) }); });
    ["Primary Skill", "Secondary Skill", "Spiral Review"].forEach(function (k) {
      if (w.phonics && w.phonics[k]) ws.push({ kind: k, t: w.phonics[k], codes: phonicsCodes(w.phonics[k]) });
    });
    if (w.hfw && w.hfw.length) ws.push({ kind: "High-frequency words", t: w.hfw.join(", "), codes: ["2.RF.3f"] });
    return { reading: r, writing: wr, wordStudy: ws };
  }
  function codesOf(items) { return uniq([].concat.apply([], items.map(function (x) { return x.codes; }))); }
  function bmCodes(p, part) {
    var w = bmWeek(p);
    return w ? codesOf(bmParts(Number(p.unit), w)[part]) : [];
  }
  function bmUnitCodes(n) {
    var u = bmUnit(n);
    if (!u) return [];
    return uniq([].concat.apply([], u.weeks.map(function (w) {
      var P = bmParts(u.u, w); return codesOf(P.reading).concat(codesOf(P.writing));
    })));
  }
  function bmOn(sb) { return !!(sb && sb.id === "reading" && sb.schema === "uwd" && sb.benchmark !== false); }

  window.BenchmarkScope = {
    UNITS: BM_UNITS, unit: bmUnit, week: bmWeek, parts: bmParts, codes: bmCodes,
    unitCodes: bmUnitCodes, skillCodes: skillCodes, on: bmOn
  };

  /* ======================================================================
     THE PLANNER
     Only when the planner's own functions are on the page: this file is
     also loaded by the gradebook, which has none of them (and has its own
     `S`, so the check is on functions, never on state).
     ====================================================================== */
  function isPlanner() {
    return typeof window.cardHTML === "function" && typeof window.editPos === "function" &&
      typeof window.advance === "function" && typeof window.openSheet === "function" &&
      typeof window.renderToday === "function" && typeof window.dayStatus === "function";
  }
  if (!isPlanner()) return;

  function e$(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function pretty(iso) {
    if (!iso) return "\u2014";
    var p = iso.split("-");
    return MON3[Number(p[1]) - 1] + " " + Number(p[2]);
  }
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ---------- the planner's own functions, kept to fall back on ---------- */
  var OWN = {
    advance: window.advance, retreat: window.retreat, fmt: window.fmt,
    absIndex: window.absIndex, cardHTML: window.cardHTML, editPos: window.editPos
  };

  /* The planner's own stepper copies the whole position (Object.assign),
     so with the guide off, a probe day's `k` rode along onto every day after
     it: "U2 · L6" on screen, { unit 2, lesson 6, k: "probe" } in storage,
     and every one of them read as the probe once the guide was back on
     (v61). Off the guide, a position is a plain unit and lesson. */
  function plain(sb, q) {
    if (sb && sb.id === "math" && q && q.k) { q = Object.assign({}, q); delete q.k; }
    return q;
  }
  window.advance = function (sb, p) {
    if (on(sb)) { var q = next(p); if (q) return q; }
    return plain(sb, OWN.advance(sb, p));
  };
  window.retreat = function (sb, p) {
    if (on(sb)) { var q = prev(p); if (q) return q; }
    return plain(sb, OWN.retreat(sb, p));
  };
  /* A day stored as a probe or a test is that day whether or not the guide
     is on now; only a plain lesson falls to the planner's own wording. */
  window.fmt = function (sb, p) {
    if (p && unit(p.unit) && (on(sb) || (sb && sb.id === "math" && p.k))) return short(p);
    return OWN.fmt(sb, p);
  };
  if (typeof OWN.absIndex === "function") {
    window.absIndex = function (sb, p) {
      if (on(sb)) { var s = find(p); if (s) return s.i; }
      return OWN.absIndex(sb, p);
    };
  }

  /* ---------- how far into the unit ----------
     Saved days before this one with Math taught in this unit, plus today
     if Math is on today. Counted from what was recorded, so it is right
     however the days got there. */
  function unitDay(u, dk, todayTaught) {
    var n = 0;
    try {
      Object.keys(DAYS).forEach(function (k) {
        if (k >= dk) return;
        var r = DAYS[k];
        if (!r || !r.saved || r.noSchool || !r.entries) return;
        var e = r.entries.math;
        if (e && e.taught && e.pos && Number(e.pos.unit) === Number(u)) n++;
      });
    } catch (x) { }
    return n + (todayTaught ? 1 : 0);
  }

  function stdChips(codes) {
    return codes.map(function (c) {
      var x = CROSS[c], or = x ? x.or : [];
      var extra = isPrior(c) ? " \u00b7 grade 1 review"
        : or.length && or.join(",") !== c ? " \u00b7 OR " + or.join(", ") : "";
      return '<span class="rv-std" title="' + e$(x ? x.lbl : c) + '"><code>' + e$(c) + "</code>" +
        (x ? " " + e$(x.lbl) : "") + (extra ? '<span class="rv-or">' + e$(extra) + "</span>" : "") + "</span>";
    }).join("");
  }

  function detailHTML(sb, e, dk) {
    var p = e && e.pos, s = find(p);
    if (!p) return "";
    if (!s) {
      var U = unit(p.unit);
      var why = U
        ? "Unit " + U.u + " has lessons 1\u2013" + lessonsOf(U.u).length + ". Tap the position to pick the day."
        : "The guide has 12 units; this is past the end of it.";
      return '<div class="rv" data-rv="' + e$(sb.id) + '"><div class="rv-t">Not in the pacing guide</div><div class="rv-x">' + e$(why) + "</div></div>";
    }
    var U2 = unit(s.u), h = '<div class="rv" data-rv="' + e$(sb.id) + '">';
    h += '<div class="rv-t">' + (s.k === "L" ? '<span class="rv-n">' + s.u + "-" + s.n + "</span> " + e$(s.t) : e$(s.t)) + "</div>";
    if (s.tg && s.tg.length) h += '<ul class="rv-tg">' + s.tg.map(function (t) { return "<li>" + e$(t) + "</li>"; }).join("") + "</ul>";
    else if (s.note) h += '<div class="rv-x">' + e$(s.note) + "</div>";
    var codes = ccss(s);
    if (codes.length) h += '<div class="rv-stds">' + (s.k === "L" ? "" : '<span class="rv-lbl">Covers</span>') + stdChips(codes) + "</div>";
    var mats = (s.m || []).concat((s.tr || []).map(function (t) { return "Teaching Resource: " + t; }));
    if (mats.length) h += '<details class="rv-m"><summary>Materials</summary><ul>' + mats.map(function (m) { return "<li>" + e$(m) + "</li>"; }).join("") + "</ul></details>";
    var nx = FLAT[s.i + 1];
    if (nx && nx.k === "probe" && s.k === "L") h += '<div class="rv-x">Next is the Formative Math Probe. The guide suggests giving it at the end of this lesson.</div>';
    var d = unitDay(s.u, dk, e.taught);
    var over = d - U2.total;
    h += '<div class="rv-pace"><span>Unit ' + s.u + " \u00b7 day " + d + " of " + U2.total +
      (over > 0 ? " \u00b7 " + over + " over the guide" : "") + "</span>" +
      '<button type="button" class="rv-yr" data-rv-year>The year</button></div>';
    return h + "</div>";
  }

  /* ---------- Benchmark on the Reading and Writing cards ---------- */
  function codeChips(codes) {
    return codes.map(function (c) { return '<code title="Matched from the skill name">' + e$(c) + "</code>"; }).join(" ");
  }
  function itemsHTML(items) {
    return '<ul class="rv-bm">' + items.map(function (x) {
      return '<li><span class="rv-k">' + e$(x.kind) + "</span> " + e$(x.t) + (x.codes.length ? ' <span class="rv-c">' + codeChips(x.codes) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  function q(t) { return "\u201c" + t + "\u201d"; }
  function bmReadingHTML(sb, e) {
    var p = e && e.pos;
    if (!p) return "";
    var U = bmUnit(p.unit), w = bmWeek(p);
    if (!U || !w) {
      return '<div class="rv" data-rv="reading"><div class="rv-t">Not in the Benchmark scope and sequence</div><div class="rv-x">' +
        e$(U ? "Each unit has three weeks." : "It has ten units, of three weeks each.") + "</div></div>";
    }
    var P = bmParts(U.u, w), h = '<div class="rv" data-rv="reading">';
    h += '<div class="rv-t">Unit ' + U.u + " \u00b7 " + e$(U.title) + " \u00b7 Week " + w.w + "</div>";
    h += '<div class="rv-x">' + e$(U.eq) + "</div>";
    var texts = (w.anchor || []).map(function (a) { return e$(a.kind) + ": " + e$(q(a.t)); });
    (w.practice || []).forEach(function (t) { texts.push("Vocabulary practice: " + e$(q(t))); });
    if (texts.length) h += '<ul class="rv-tg">' + texts.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
    h += itemsHTML(P.reading);
    var words = (w.words.ga || []).concat(w.words.ds || []);
    if (words.length) h += '<div class="rv-x"><span class="rv-k">Words</span> ' + e$(words.join(", ")) + "</div>";
    if (w.meta && w.meta.length) h += '<div class="rv-x"><span class="rv-k">Strategies</span> ' + e$(w.meta.join(" \u00b7 ")) + "</div>";
    var dec = [["Interactive", w.reads.interactive], ["Accountable", w.reads.accountable], ["Word study read", w.reads.wordStudy]]
      .filter(function (x) { return x[1]; }).map(function (x) { return { kind: x[0], t: q(x[1]), codes: [] }; });
    h += '<details class="rv-m"><summary>Word study and decodables</summary>' + itemsHTML(dec.concat(P.wordStudy)) + "</details>";
    h += '<div class="rv-pace"><span>Research & inquiry: ' + e$(U.project) + "</span></div>";
    return h + "</div>";
  }
  function bmWritingHTML() {
    var rs = sub("reading"), re = draft && draft.entries && draft.entries.reading;
    if (!bmOn(rs) || !re || !re.pos) return "";
    var w = bmWeek(re.pos);
    if (!w) return "";
    var P = bmParts(Number(re.pos.unit), w);
    return '<div class="rv" data-rv="writing"><div class="rv-t">Benchmark Unit ' + Number(re.pos.unit) + " \u00b7 Week " + w.w + "</div>" +
      itemsHTML(P.writing) + '<div class="rv-pace"><span>From today\u2019s Reading position</span></div></div>';
  }

  /* ---------- Math days recorded before the guide ----------
     The old stepper rolled over at ten lessons a unit, so a day recorded on
     it says where the stepper was, not which Reveal day was taught.
     pacingFrom is the day this file first drew the Math card; days saved
     before it are the ones to line up. */
  /* Days saved on the old stepper. v60 took these to be the days dated
     before the first day the guide drew the card, which missed any day
     saved ahead of time: today, if it was saved that morning, and anything
     planned for later in the week. Those kept their old counts, so the
     chain after them ran off the end of the unit (v61). The Math days that
     already existed when the guide first drew are in `pacingOld`, whatever
     their dates; a subject stamped by v60, which has no list, keeps the
     date rule. */
  function hasMath(r) {
    var e = r && r.entries && r.entries.math;
    return !!(r && r.saved && !r.noSchool && e && e.taught && e.pos);
  }
  function oldMathDays(sb) {
    if (!sb || !sb.pacingFrom) return [];
    var snap = Array.isArray(sb.pacingOld) ? sb.pacingOld : null;
    return Object.keys(DAYS).sort().filter(function (k) {
      if (!hasMath(DAYS[k])) return false;
      return k < sb.pacingFrom || (snap ? snap.indexOf(k) >= 0 : false);
    });
  }
  function stampPacing(sb) {
    sb.pacingFrom = key(new Date());
    sb.pacingOld = Object.keys(DAYS).sort().filter(function (k) { return hasMath(DAYS[k]); });
    persistSettings();
  }
  /* A planner that has never taught a Math day starts the year where the
     guide does, on the Unit 1 diagnostic, rather than on Lesson 1-1, two
     days in (v61). The first-day plan the planner seeds is saved but has
     every subject skipped, so "never taught" is the test, and its Math is
     moved too, since the next day carries forward from it. Only the
     untouched default { unit 1, lesson 1 } is moved, and only on skipped
     days, so a real start or a real day is never changed. Converges: once
     it has run there is nothing left for it to match. */
  function isDefault(q) {
    return !!(q && !q.k && Number(q.unit) === 1 && Number(q.lesson) === 1 && Object.keys(q).length === 2);
  }
  function startAtGuide(sb) {
    var ks = Object.keys(DAYS);
    if (ks.some(function (k) { var r = DAYS[k], e = r && r.entries && r.entries.math; return r && r.saved && e && e.taught; })) return;
    var first = posOf(FLAT[0]), changedDays = false;
    if (isDefault(sb.start)) { sb.start = posOf(FLAT[0]); persistSettings(); }
    ks.forEach(function (k) {
      var e = DAYS[k] && DAYS[k].entries && DAYS[k].entries.math;
      if (e && !e.taught && isDefault(e.pos)) { e.pos = posOf(FLAT[0]); changedDays = true; }
    });
    if (changedDays) { invalidateDayCache(); persist(); }
    var e = draft && draft.entries && draft.entries.math;
    if (e && !dirty && isDefault(e.pos)) e.pos = first;
  }
  function lineupNoteHTML(sb) {
    if (!sb || sb.pacingReconciled) return "";
    var n = oldMathDays(sb).length;
    if (!n) return "";
    return '<div class="rv-note">' + n + " Math day" + (n === 1 ? " was" : "s were") +
      ' recorded on the old stepper, before the guide. <button type="button" class="rv-yr" data-rv-lineup>Line them up</button></div>';
  }

  window.cardHTML = function (sb) {
    try { if (on(sb)) startAtGuide(sb); } catch (x) { }
    var html = OWN.cardHTML(sb);
    try {
      var at = html.indexOf('<div class="prov">'), add = "";
      if (on(sb)) {
        if (!sb.pacingFrom) stampPacing(sb);
        add = lineupNoteHTML(sb) + detailHTML(sb, draft.entries[sb.id], key(cursor));
      } else if (sb && sb.id === "math" && sb.schema === "ul" && sb.pacing === false) {
        add = '<div class="rv rv-offl"><button type="button" class="rv-yr" data-rv-on>Follow the Reveal pacing guide</button></div>';
      } else if (bmOn(sb)) {
        add = bmReadingHTML(sb, draft.entries[sb.id]);
      } else if (sb && sb.id === "writing") {
        add = bmWritingHTML();
      }
      if (add && at >= 0) html = html.slice(0, at) + add + html.slice(at);
    } catch (x) { }
    return html;
  };

  function openLineup() {
    var sb = sub("math"), ks = oldMathDays(sb);
    if (!ks.length) return;
    var olds = ks.map(function (k) { return DAYS[k].entries.math.pos; });
    function clamp(i) { return Math.max(0, Math.min(FLAT.length - 1, i)); }
    function propose(mode) {
      return olds.map(function (p) {
        if (mode === "count") { var ix = OWN.absIndex ? OWN.absIndex(sb, p) : null; return clamp(ix == null ? 0 : ix); }
        var s = find(p) || find(next(p) || {});
        return s ? s.i : 0;
      });
    }
    /* If any day sits where the guide has nothing (U1 L7, say), the stepper
       was being pressed once a day and is a count. Otherwise it may have
       been set to the real lesson by hand. The sheet says which it assumed
       and either can be chosen. */
    var mode = olds.some(function (p) { return !find(p); }) ? "count" : "lesson";
    var vals = propose(mode), touched = {};
    var opts = FLAT.map(function (s) {
      return '<option value="' + s.i + '">' + e$(short(posOf(s)) + (s.k === "L" ? " \u00b7 " + s.t : "")) + "</option>";
    }).join("");
    var rows = ks.map(function (k, i) {
      var d = parseKey(k);
      return "<tr><td>" + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] + " " + pretty(k) + '</td><td class="rv-num">' +
        e$(OWN.fmt(sb, olds[i])) + '</td><td><select data-lu="' + i + '" aria-label="Guide day for ' + e$(k) + '">' + opts + "</select></td></tr>";
    }).join("");
    openSheet(
      "<h2>Line up the Math days</h2>" +
      '<p class="hint">These days were saved on the old stepper. Pick the Reveal day each one really was. Changing one moves the ones after it by the same amount, until you change those too.</p>' +
      '<div class="rv-modes" role="radiogroup">' +
      '<label class="rv-opt"><input type="radio" name="rvmode" value="count"' + (mode === "count" ? " checked" : "") + "> <span>I pressed + once a day, so the stepper counted days</span></label>" +
      '<label class="rv-opt"><input type="radio" name="rvmode" value="lesson"' + (mode === "lesson" ? " checked" : "") + "> <span>I set the stepper to the real lesson</span></label></div>" +
      '<div class="rv-tablewrap"><table class="rv-table"><thead><tr><th>Day</th><th>Recorded</th><th>Reveal day</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<div class="sheetbar"><button class="primary" data-lu-apply>Save these</button><button class="ghost" data-lu-leave>Leave them as recorded</button><button class="ghost" data-sheet-cancel>Not now</button></div>',
      function (el) {
        function paint() { el.querySelectorAll("[data-lu]").forEach(function (s) { s.value = String(vals[Number(s.dataset.lu)]); }); }
        paint();
        el.querySelectorAll('input[name="rvmode"]').forEach(function (r) {
          r.onchange = function () { vals = propose(r.value); touched = {}; paint(); };
        });
        el.querySelectorAll("[data-lu]").forEach(function (s) {
          s.onchange = function () {
            var i = Number(s.dataset.lu), nv = Number(s.value), delta = nv - vals[i];
            vals[i] = nv; touched[i] = true;
            for (var j = i + 1; j < vals.length; j++) if (!touched[j]) vals[j] = clamp(vals[j] + delta);
            paint();
          };
        });
        el.querySelector("[data-lu-apply]").onclick = function () {
          var backup = {};
          ks.forEach(function (k, i) { backup[k] = DAYS[k].entries.math.pos; DAYS[k].entries.math.pos = posOf(FLAT[vals[i]]); });
          sb.pacingBackup = backup; sb.pacingReconciled = true;
          invalidateDayCache(); persist(); persistSettings();
          if (!dirty) draft = null;
          closeSheet(); render();
          try { toast(ks.length + " Math days lined up with the guide"); } catch (x) { }
        };
        el.querySelector("[data-lu-leave]").onclick = function () {
          sb.pacingReconciled = true; persistSettings(); closeSheet(); renderToday();
        };
      });
  }
  function undoLineup() {
    var sb = sub("math");
    if (!sb || !sb.pacingBackup) return;
    Object.keys(sb.pacingBackup).forEach(function (k) {
      var e = DAYS[k] && DAYS[k].entries && DAYS[k].entries.math;
      if (e) e.pos = sb.pacingBackup[k];
    });
    delete sb.pacingBackup; sb.pacingReconciled = false;
    invalidateDayCache(); persist(); persistSettings();
    if (!dirty) draft = null;
    closeSheet(); render();
  }

  /* ---------- Math's position sheet: pick the day from the guide ---------- */
  window.editPos = function (id) {
    var sb = sub(id);
    if (!on(sb)) return OWN.editPos(id);
    var e = draft.entries[id], cur = find(e.pos);
    var u0 = cur ? cur.u : (unit(e.pos && e.pos.unit) ? Number(e.pos.unit) : 1);
    function opts(u, pick) {
      return unit(u).steps.map(function (s) {
        var lab = s.k === "L" ? "<b>" + s.u + "-" + s.n + "</b> " + e$(s.t) : e$(s.t);
        return '<label class="rv-opt"><input type="radio" name="rvstep" value="' + s.i + '"' + (pick === s.i ? " checked" : "") + "> <span>" + lab + "</span></label>";
      }).join("");
    }
    var unitOpts = UNITS.map(function (u) {
      return '<option value="' + u.u + '"' + (u.u === u0 ? " selected" : "") + ">Unit " + u.u + " \u00b7 " + e$(u.title) + "</option>";
    }).join("");
    openSheet(
      "<h2>" + e$(sb.name) + "</h2>" +
      '<p class="hint">Where Math is in the Reveal Math Grade 2 pacing guide.</p>' +
      '<label class="rv-lab">Unit<select data-rv-unit>' + unitOpts + "</select></label>" +
      '<div class="rv-pick" role="radiogroup" aria-label="Day in the unit">' + opts(u0, cur ? cur.i : unit(u0).steps[0].i) + "</div>" +
      '<label class="rv-offbox"><input type="checkbox" data-rv-off> Stop following the guide for Math and step by lesson number</label>' +
      '<div class="sheetbar"><button class="primary" data-sheet-save>Set position</button><button class="ghost" data-sheet-cancel>Cancel</button></div>',
      function (el) {
        var sel = el.querySelector("[data-rv-unit]"), box = el.querySelector(".rv-pick");
        sel.onchange = function () { var u = Number(sel.value); box.innerHTML = opts(u, unit(u).steps[0].i); };
        el.querySelector("[data-sheet-save]").onclick = function () {
          if (el.querySelector("[data-rv-off]").checked) {
            sb.pacing = false;
            persistSettings(); closeSheet(); renderToday();
            return;
          }
          var r = el.querySelector('input[name="rvstep"]:checked');
          if (r) e.pos = posOf(FLAT[Number(r.value)]);
          closeSheet(); touch(); renderToday();
        };
      });
  };

  /* ---------- the year ----------
     The guide laid over this year's calendar: every school day with a Math
     block, in order, dealt out a unit's whole budget at a time. */
  function mathDays() {
    var out = [];
    try {
      var d = parseKey(YEAR.first), end = YEAR.last;
      for (var i = 0; i < 400 && iso(d) <= end; i++) {
        var st = dayStatus(d);
        var tpl = (S.templates && S.templates[d.getDay()]) || [];
        if (st.school && tpl.some(function (b) { return b && b.s === "math"; })) out.push(iso(d));
        d = addDays(d, 1);
      }
    } catch (x) { }
    return out;
  }
  function actuals() {
    var out = {};
    try {
      Object.keys(DAYS).sort().forEach(function (k) {
        var r = DAYS[k];
        if (!r || !r.saved || r.noSchool || !r.entries) return;
        var e = r.entries.math;
        if (!e || !e.taught || !e.pos || !unit(e.pos.unit)) return;
        var o = out[e.pos.unit] = out[e.pos.unit] || { from: k, to: k, n: 0 };
        o.to = k; o.n++;
      });
    } catch (x) { }
    return out;
  }
  function openYear() {
    var days = mathDays(), pl = plan(days), act = actuals(), dk = key(cursor);
    var e = draft && draft.entries && draft.entries.math, here = find(e && e.pos);
    var expect = unitOnDate(pl, dk);
    var spare = days.length - TOTAL;
    var rows = pl.map(function (r) {
      var U = unit(r.u), a = act[r.u];
      var mine = here && here.u === r.u;
      return "<tr" + (mine ? ' class="rv-here"' : "") + "><td><b>" + r.u + "</b> " + e$(U.title) + "</td>" +
        '<td class="rv-num">' + U.total + "</td>" +
        "<td>" + (r.from ? pretty(r.from) + "\u2013" + pretty(r.to) + (r.short ? " (runs out)" : "") : "not on the calendar") + "</td>" +
        "<td>" + (a ? pretty(a.from) + "\u2013" + pretty(a.to) + " \u00b7 " + a.n + (a.n === 1 ? " day" : " days") : "\u2014") + "</td></tr>";
    }).join("");
    var lead = "";
    if (expect && here) {
      lead = here.u === expect ? "By the calendar the guide has you in Unit " + expect + " today, and that is where you are."
        : "By the calendar the guide has you in Unit " + expect + " today. You are in Unit " + here.u + ".";
    } else if (expect) lead = "By the calendar the guide has you in Unit " + expect + " today.";
    openSheet(
      "<h2>Reveal Math \u00b7 the year</h2>" +
      '<p class="hint">' + e$(lead) + "</p>" +
      '<div class="rv-tablewrap"><table class="rv-table"><thead><tr><th>Unit</th><th class="rv-num">Days</th><th>The guide, on this calendar</th><th>Taught</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<p class="hint">' + e$(days.length + " school days this year have a Math block. The guide uses " + TOTAL +
        (spare >= 0 ? ", which leaves " + spare + " to spare." : ", " + (-spare) + " more than the calendar has.") +
        " Each unit's days include its flex days.") + "</p>" +
      '<div class="sheetbar">' + (sub("math") && sub("math").pacingBackup ? '<button class="ghost" data-rv-undo>Put back the old stepper positions</button>' : "") +
      '<button class="ghost" data-sheet-cancel>Close</button></div>');
  }

  /* one listener for the card's own buttons, and to redraw the detail when
     + or − moves Math (the planner changes the readout text in place and
     does not redraw the card, so neither would this) */
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target : null;
    if (!t) return;
    if (t.closest("[data-rv-year]")) { openYear(); return; }
    if (t.closest("[data-rv-lineup]")) { openLineup(); return; }
    if (t.closest("[data-rv-undo]")) { undoLineup(); return; }
    if (t.closest("[data-rv-on]")) {
      var sb = sub("math");
      if (sb) { delete sb.pacing; persistSettings(); renderToday(); }
      return;
    }
    var st = t.closest("[data-step]");
    if (st && st.dataset.id) {
      var sb2 = sub(st.dataset.id);
      if (bmOn(sb2)) {
        var re = draft && draft.entries.reading;
        [["reading", function () { return bmReadingHTML(sb2, re); }], ["writing", bmWritingHTML]].forEach(function (pair) {
          var el = document.querySelector('.rv[data-rv="' + pair[0] + '"]');
          var w2 = document.createElement("div"); w2.innerHTML = pair[1]();
          if (el && w2.firstChild) el.replaceWith(w2.firstChild);
          else if (el) el.remove();
          else if (w2.firstChild) {
            var art = document.querySelector('[data-note="' + pair[0] + '"]');
            var prov = art && art.parentNode && art.parentNode.querySelector(".prov");
            if (prov) prov.parentNode.insertBefore(w2.firstChild, prov);
          }
        });
        return;
      }
      if (!on(sb2)) return;
      var old = document.querySelector('.rv[data-rv="' + sb2.id + '"]');
      var e = draft && draft.entries[sb2.id];
      if (old && e) {
        var w = document.createElement("div");
        w.innerHTML = detailHTML(sb2, e, key(cursor));
        if (w.firstChild) old.replaceWith(w.firstChild);
      }
    }
  });

  /* ---------- look ----------
     The planner's own variables, which suite-theme.css re-points for all
     three looks, so this reads right in 2006, 2026 and 2046 alike. Quiet:
     no colour of its own. */
  var css = document.createElement("style");
  css.id = "rv-style";
  css.textContent =
    ".rv{margin-top:11px;padding-top:10px;border-top:1.5px dashed var(--line);font-family:var(--body);color:var(--ink)}" +
    ".rv-t{font-size:14.5px;font-weight:700;line-height:1.35}" +
    ".rv-n{font-family:var(--mono);font-weight:700;margin-right:2px}" +
    ".rv-tg{margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.5}" +
    ".rv-tg li{margin:2px 0}" +
    ".rv-x{font-size:13px;line-height:1.5;color:var(--ink-2);margin-top:6px}" +
    ".rv-stds{display:flex;flex-wrap:wrap;gap:5px 10px;margin-top:8px;font-size:12.5px;color:var(--ink-2)}" +
    ".rv-std code{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--ink)}" +
    ".rv-or{color:var(--ink-3)}" +
    ".rv-lbl{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);align-self:center}" +
    ".rv-m{margin-top:8px;font-size:13px;color:var(--ink-2)}" +
    ".rv-m summary{cursor:pointer;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);min-height:24px}" +
    ".rv-m ul{margin:4px 0 0;padding-left:18px;line-height:1.5}" +
    ".rv-pace{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3)}" +
    ".rv-yr{margin-left:auto;font:inherit;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2);background:none;" +
      "border:1.5px solid var(--line);border-radius:999px;padding:4px 11px;min-height:28px;cursor:pointer}" +
    ".rv-offl{border-top:0;padding-top:0}.rv-offl .rv-yr{margin-left:0}" +
    ".sub.skip .rv{opacity:.4}" +
    ".rail .sub.skip:not(:has(.subtime)) .rv{display:none}" +
    ".rv-lab{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--ink-2);margin-bottom:10px}" +
    ".rv-lab select{width:100%;padding:9px 10px;border:1.5px solid var(--line-2);border-radius:10px;background:var(--card)}" +
    ".rv-pick{display:flex;flex-direction:column;gap:2px;max-height:46vh;overflow:auto;margin-bottom:12px;border:1.5px solid var(--line);border-radius:10px;padding:6px}" +
    ".rv-opt{display:flex;align-items:flex-start;gap:8px;padding:7px 6px;border-radius:7px;font-size:14px;line-height:1.35;cursor:pointer}" +
    ".rv-opt b{font-family:var(--mono)}" +
    ".rv-opt input{margin-top:2px;flex:0 0 auto}" +
    ".rv-opt:has(input:checked){background:color-mix(in srgb,var(--ink) 7%,transparent)}" +
    ".rv-offbox{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--ink-3);margin-bottom:14px}" +
    ".rv-tablewrap{overflow-x:auto;margin-bottom:12px}" +
    ".rv-table{border-collapse:collapse;width:100%;font-size:13px;min-width:460px}" +
    ".rv-table th{text-align:left;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);font-weight:500;padding:4px 6px;border-bottom:1.5px solid var(--line)}" +
    ".rv-table td{padding:6px;border-bottom:1px solid var(--line);vertical-align:top}" +
    ".rv-num{text-align:right;font-family:var(--mono)}" +
    ".rv-here td{font-weight:700;background:color-mix(in srgb,var(--ink) 6%,transparent)}" +
    ".rv-bm{margin:7px 0 0;padding:0;list-style:none;font-size:13.5px;line-height:1.45}" +
    ".rv-bm li{margin:3px 0}" +
    ".rv-k{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin-right:3px}" +
    ".rv-c code{font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--ink-2)}" +
    ".rv-note{margin-top:10px;font-size:13px;line-height:1.45;color:var(--ink-2);display:flex;gap:8px;align-items:center;flex-wrap:wrap}" +
    ".rv-note .rv-yr{margin-left:0}" +
    ".rv-modes{display:flex;flex-direction:column;gap:2px;margin-bottom:10px}" +
    ".rv-table select{max-width:100%;font-size:14px;padding:5px 6px;border:1.5px solid var(--line-2);border-radius:8px;background:var(--card)}";
  document.head.appendChild(css);

  /* ================= The week ahead, for families (v64) =================
     A button on the Week tab builds bullet points for a family email:
     Math from the Reveal guide, Reading and phonics from Benchmark (the
     teacher's call: Benchmark's phonics skill and sight words match what the
     class does in ECRI), and Science / SS from the topic line on its card.
     Nothing comes from the day notes, which are where sub instructions and
     other teacher-only things go. WIN Time is left out.

     A week ahead is mostly unsaved days, so each subject is walked forward
     the way the planner suggests a next day, one scheduled school day at a
     time from the last day taught: a saved day is used as saved (skipped
     means left out), a closed day or a day with no block for the subject is
     passed over. The preview is editable, and copied as HTML with a plain
     text copy beside it, so it pastes into an email as a bulleted list. */
  var FAM = { start: null };
  function famKey(d) { return key(d); }
  function scheduled(sb, d) {
    return (S.templates[d.getDay()] || []).some(function (b) { return b && b.s === sb.id; });
  }
  function lastTaughtBefore(sb, k) {
    var ks = Object.keys(DAYS).filter(function (x) { return x < k; }).sort().reverse();
    for (var i = 0; i < ks.length; i++) {
      var r = DAYS[ks[i]], e = r && r.entries && r.entries[sb.id];
      if (!r || !r.saved || r.noSchool) continue;
      if (e && e.taught && e.pos) return { k: ks[i], pos: e.pos };
    }
    return null;
  }
  function nextPos(sb, p) { return sb.schema === "free" ? Object.assign({}, p) : window.advance(sb, p); }
  /* { dateKey: {pos, taught} } for the subject on the school days from..to */
  function project(sb, fromKey, toKey) {
    var out = {}, base = lastTaughtBefore(sb, fromKey);
    var pos = base ? nextPos(sb, base.pos) : Object.assign({}, sb.start);
    var d = base ? addDays(parseKey(base.k), 1) : parseKey(fromKey), guard = 0;
    while (famKey(d) <= toKey && guard++ < 400) {
      var k = famKey(d);
      if (dayStatus(d).school && scheduled(sb, d)) {
        var r = DAYS[k], e = r && r.saved && r.entries && r.entries[sb.id];
        if (e) {
          if (k >= fromKey) out[k] = { pos: e.pos, taught: !!e.taught };
          if (e.taught && e.pos) pos = nextPos(sb, e.pos);
        } else {
          if (k >= fromKey) out[k] = { pos: pos, taught: true };
          pos = nextPos(sb, pos);
        }
      }
      d = addDays(d, 1);
    }
    return out;
  }
  function weekStartFor(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
  /* the week the Week tab shows; from Friday on, "ahead" is the next one */
  function defaultWeek() {
    var today = new Date(), shown = weekStartFor(cursor), now = weekStartFor(today);
    var dow = today.getDay();
    if (famKey(shown) === famKey(now) && (dow === 5 || dow === 6 || dow === 0)) return addDays(now, 7);
    return shown;
  }
  function mdy(d) { return MON[d.getMonth()] + " " + d.getDate(); }
  function famPhrase(t) {
    var x = String(t || "").trim().replace(/^I can\s+/i, "").replace(/[.\s]+$/, "");
    return x ? x.charAt(0).toUpperCase() + x.slice(1) : "";
  }
  function uniq(a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }

  /* ---- in families' words (v68) ----
     The teacher asked for Math in parent-friendly language, summarised,
     rather than the guide's "I can" targets one per line ("Identify
     patterns when skip counting by 5s"). Each lesson has a plain phrase
     here, written as the middle of a sentence; the week's phrases are
     merged into one line (see famSummary). A lesson missing from this
     table falls back to its first "I can", so nothing is ever dropped. */
  var FAM_MATH = {
    "1|1": "sharing our own math stories", "1|2": "making sense of problems and trying different ways to solve them",
    "1|3": "using math to describe real-life situations", "1|4": "explaining our thinking",
    "1|5": "finding and continuing patterns", "1|6": "working well on our own and in groups",
    "2|1": "seeing how 10 tens make 100", "2|2": "learning what each digit means in a 3-digit number",
    "2|3": "reading and writing numbers up to 1,000", "2|4": "breaking 3-digit numbers into hundreds, tens, and ones in different ways",
    "2|5": "comparing 3-digit numbers",
    "3|1": "counting by 1s up to 1,000", "3|2": "skip counting by 5s", "3|3": "skip counting by 10s and 100s",
    "3|4": "learning about even and odd numbers", "3|5": "showing even numbers as doubles (like 4 + 4)",
    "3|6": "skip counting to find the total in an array (objects set out in rows)", "3|7": "writing addition equations to match an array",
    "4|1": "solving adding-on word problems", "4|2": "solving taking-away word problems",
    "4|3": "working through two-step problems that add on and take away",
    "4|4": "solving putting-together word problems", "4|5": "solving taking-apart word problems",
    "4|6": "working through two-step problems that put together and take apart",
    "4|7": "solving comparing word problems (finding the bigger amount)", "4|8": "solving comparing word problems (finding the smaller amount)",
    "4|9": "working through two-step comparing problems", "4|10": "working through two-step word problems with addition and subtraction",
    "5|1": "adding within 20 by counting on", "5|2": "adding within 20 using other quick strategies",
    "5|3": "adding 2-digit numbers with base-ten blocks", "5|4": "learning that numbers can be added in any order",
    "5|5": "breaking both numbers into tens and ones to add", "5|6": "using a number line to add",
    "5|7": "breaking just one number apart to add", "5|8": "changing numbers into friendlier ones to add",
    "5|9": "adding three or more 2-digit numbers", "5|10": "solving one-step and two-step addition word problems",
    "6|1": "subtracting within 20 by counting up or back", "6|2": "subtracting within 20 by making a 10",
    "6|3": "subtracting 2-digit numbers with base-ten blocks", "6|4": "regrouping to subtract 2-digit numbers (sometimes called borrowing)",
    "6|5": "using a number line to subtract", "6|6": "breaking numbers apart to subtract",
    "6|7": "changing numbers into friendlier ones to subtract", "6|8": "using addition to solve subtraction",
    "6|9": "solving one-step subtraction word problems", "6|10": "solving two-step subtraction word problems",
    "7|1": "measuring length in inches", "7|2": "measuring length in feet and yards",
    "7|3": "comparing lengths in inches, feet, and yards", "7|4": "learning how inches, feet, and yards are related",
    "7|5": "estimating length in inches, feet, and yards using everyday objects",
    "7|6": "measuring length in centimeters and meters", "7|7": "comparing lengths in centimeters and meters",
    "7|8": "learning how centimeters and meters are related", "7|9": "estimating length in centimeters and meters using everyday objects",
    "7|10": "solving word problems about length", "7|11": "solving length problems on a number line",
    "8|1": "learning what each coin is worth", "8|2": "counting a mix of coins",
    "8|3": "counting money with dollar bills and coins", "8|4": "telling time to the nearest five minutes",
    "8|5": "knowing whether a time is a.m. or p.m.",
    "9|1": "adding 10 or 100 in our heads", "9|2": "adding 3-digit numbers without regrouping",
    "9|3": "adding 3-digit numbers with regrouping (sometimes called carrying)",
    "9|4": "breaking 3-digit numbers into hundreds, tens, and ones to add", "9|5": "breaking just one number apart to add 3-digit numbers",
    "9|6": "changing numbers into friendlier ones to add", "9|7": "explaining our addition strategies",
    "10|1": "subtracting 10 or 100 in our heads", "10|2": "subtracting 3-digit numbers without regrouping",
    "10|3": "counting back to subtract 3-digit numbers", "10|4": "counting up to subtract 3-digit numbers",
    "10|5": "regrouping tens to subtract 3-digit numbers", "10|6": "regrouping tens and hundreds to subtract 3-digit numbers",
    "10|7": "changing numbers into friendlier ones to subtract", "10|8": "explaining our subtraction strategies",
    "10|9": "solving word problems with addition and subtraction",
    "11|1": "making picture graphs", "11|2": "making bar graphs", "11|3": "solving problems with bar graphs",
    "11|4": "measuring objects to collect data", "11|5": "reading line plots", "11|6": "making line plots",
    "12|1": "recognizing flat (2-D) shapes", "12|2": "drawing flat (2-D) shapes", "12|3": "recognizing solid (3-D) shapes",
    "12|4": "finding equal shares", "12|5": "splitting shapes into halves, thirds, and fourths",
    "12|6": "splitting rectangles into rows and columns of equal squares"
  };
  function famMath(st) {
    var p = FAM_MATH[st.u + "|" + st.n];
    if (p) return p;
    var t = famPhrase((st.tg || [])[0]) || st.t || "";
    return t.charAt(0).toLowerCase() + t.slice(1);
  }
  /* Consecutive phrases that open (and maybe close) the same way become
     one: "skip counting by 5s" + "skip counting by 10s and 100s" is "skip
     counting by 5s, 10s, and 100s", "making picture graphs" + "making bar
     graphs" is "making picture and bar graphs". They must share two or
     more words at the start, or share words and differ by single words
     only ("reading" / "making" line plots); anything else stays as
     written, so "counting a mix of coins" never runs into "counting
     money with dollar bills". */
  function listJoin(a) {
    if (a.length < 2) return a.join("");
    var sep = a.some(function (x) { return /, /.test(x); }) ? "; " : ", ";
    return a.length === 2 ? a[0] + " and " + a[1] : a.slice(0, -1).join(sep) + sep + "and " + a[a.length - 1];
  }
  function mergeMids(mids) {
    /* "10s and 100s", "inches, feet, and yards": single words run together */
    var flat = [], single = true;
    mids.forEach(function (m) {
      var parts = m.split(/,\s*(?:and\s+)?|\s+and\s+/);
      if (parts.some(function (x) { return !x || /\s/.test(x); })) single = false;
      flat = flat.concat(parts);
    });
    return single ? uniq(flat) : mids;
  }
  function oneWords(m) { return m.split(/,\s*(?:and\s+)?|\s+and\s+/).every(function (x) { return x && !/\s/.test(x); }); }
  function famSummary(phrases) {
    var groups = [];
    phrases.forEach(function (ph) {
      var w = ph.split(" "), g = groups[groups.length - 1];
      if (g) {
        if (g.pre != null) {
          var n = w.length - g.pre - g.suf;
          var mid = w.slice(g.pre, w.length - g.suf).join(" ");
          if (n > 0 && w.slice(0, g.pre).join(" ") === g.head && w.slice(w.length - g.suf).join(" ") === g.tail && (g.pre >= 2 || oneWords(mid))) {
            g.mids.push(mid); return;
          }
        } else {
          var a = g.words, pre = 0, suf = 0;
          while (pre < a.length && pre < w.length && a[pre] === w[pre]) pre++;
          while (suf < a.length - pre && suf < w.length - pre && a[a.length - 1 - suf] === w[w.length - 1 - suf]) suf++;
          var m1 = a.slice(pre, a.length - suf).join(" "), m2 = w.slice(pre, w.length - suf).join(" ");
          if (pre + suf >= 2 && m1 && m2 && (pre >= 2 || (oneWords(m1) && oneWords(m2)))) {
            g.pre = pre; g.suf = suf; g.head = a.slice(0, pre).join(" "); g.tail = a.slice(a.length - suf).join(" ");
            g.mids = [a.slice(pre, a.length - suf).join(" "), w.slice(pre, w.length - suf).join(" ")];
            return;
          }
        }
      }
      groups.push({ words: w, pre: null });
    });
    var out = groups.map(function (g) {
      if (g.pre == null) return g.words.join(" ");
      return [g.head, listJoin(mergeMids(g.mids)), g.tail].filter(Boolean).join(" ");
    });
    var s = listJoin(out);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  /* Reading's one goal for the week. v68 picked it; v69, the teacher's
     call: both columns are skills the class works on all week, and he
     picks whichever is most useful for families to practise at home. So
     the sheet lists every one of the week's metacognitive and fix-up
     strategies and comprehension strategies in plain words, and he
     chooses. Until he does, the default is v68's: the first metacognitive
     strategy, or in Units 7 to 10 (which only say "Apply Strategies"
     there) the first comprehension strategy. */
  var FAM_META = [
    [/^Metacognitive: Ask Questions About Characters/, "Asking questions about the characters and events in stories"],
    [/^Metacognitive: Ask Questions/, "Asking questions as we read to help us understand"],
    [/^Metacognitive: Create Mental Images of Characters/, "Picturing the characters and events in stories to help us understand them"],
    [/^Metacognitive: Create Mental Images/, "Making mental images to help us understand what we read"],
    [/^Metacognitive: Draw Inferences/, "Making inferences: using clues to figure out what the author doesn\u2019t say outright"],
    [/^Metacognitive: Make Connections/, "Making connections between what we read and our own lives"],
    [/^Metacognitive: Distinguish Between Important/, "Picking out the most important ideas in what we read"],
    [/^Metacognitive: Summarize/, "Summing up what we read in our own words"],
    [/^Fix-Up: Reread/, "Rereading when something doesn\u2019t make sense"],
    [/^Fix-Up: Read On/, "Reading on to clear up a confusing part"],
    [/^Fix-Up: Stop and Think About the Author/, "Stopping to think about why the author wrote something"],
    [/^Fix-Up: Read Out Loud/, "Reading out loud to help us understand"],
    [/^Fix-Up: Read More Slowly/, "Slowing down and thinking about the words"]
  ];
  var FAM_COMP = [
    [/^Identify Main Topic/, "Finding the main topic and key details in what we read"],
    [/^Explain How Images/, "Using pictures and photos to help us understand what we read"],
    [/^Recount Stories.*\(Recount/, "Retelling stories and finding their lesson or message"],
    [/^Recount Stories/, "Figuring out the lesson or message of a story"],
    [/^Describe the Overall Structure/, "Noticing how a story begins, builds, and ends"],
    [/^Compare and Contrast/, "Comparing the most important points in two texts on the same topic"],
    [/^Introduce Poetry/, "Reading poetry"],
    [/^Describe How Characters Respond/, "Talking about how characters respond to big events and challenges"],
    [/^Use Illustrations and Words/, "Using the words and pictures to understand characters, setting, and plot"],
    [/^Describe a Connection/, "Connecting the events, ideas, or steps in what we read"],
    [/^Acknowledge Differences in the Points of View/, "Noticing how different characters see things differently"],
    [/^Compare Two Versions/, "Comparing two versions of the same story"],
    [/^Identify Main Purpose/, "Figuring out why an author wrote a text"],
    [/^Distinguish Between Important/, "Picking out the most important ideas in what we read"],
    [/^Ask and Answer Questions/, "Asking and answering questions about the key details in what we read"],
    [/^Use Text Features/, "Using headings, captions, and other text features to find facts"],
    [/^Analyze How the Author/, "Looking at the reasons an author gives to support their points"]
  ];
  function famLookup(table, t) {
    for (var i = 0; i < table.length; i++) if (table[i][0].test(t)) return table[i][1];
    return null;
  }
  function famComp(c) {
    var poem = /^Read a Poem: Understand (.+)$/.exec(c);
    return poem ? "Reading poems and noticing " + poem[1].toLowerCase() : famLookup(FAM_COMP, c) || c;
  }
  /* [{ src, t, col }]: src is the scope and sequence's own wording, which
     is what a choice is saved as; the default comes first in its column */
  function famGoalOptions(w) {
    var o = [], seen = {};
    function add(src, t, col) { if (t && !seen[t]) { seen[t] = 1; o.push({ src: src, t: t, col: col }); } }
    (w.meta || []).forEach(function (x) { if (!/Apply/.test(x)) add(x, famLookup(FAM_META, x), "meta"); });
    (w.comp || []).forEach(function (x) { add(x, famComp(x), "comp"); });
    return o;
  }
  function famGoalDefault(opts) {
    return opts.filter(function (x) { return x.col === "meta" && /^Metacognitive:/.test(x.src); })[0] ||
      opts.filter(function (x) { return x.col === "comp"; })[0] || opts[0] || null;
  }
  function goalStore() {
    var rd = sub("reading");
    return (rd && rd.goal && typeof rd.goal === "object") ? rd.goal : FAM.goal || (FAM.goal = {});
  }
  function saveGoal(k, src) {
    var rd = sub("reading");
    var st = rd ? (rd.goal && typeof rd.goal === "object" ? rd.goal : (rd.goal = {})) : goalStore();
    st[k] = src;
    if (rd) persistSettings();
  }

  /* [{ head, lines[] }] for the week starting Monday `mon` */
  function familySections(mon) {
    var days = [0, 1, 2, 3, 4].map(function (i) { return addDays(mon, i); });
    var from = famKey(days[0]), to = famKey(days[4]), out = [];
    /* A general overview of the topics, not a day-by-day (v65, the
       teacher's call): no weekdays, no closed-day lines, and the quick
       check-ins (probes, diagnostics) left out as not topics. */

    var m = sub("math");
    if (m && m.on) {
      /* v68: the week's lessons as one plain-language line per unit, the
         opener folded into it ("Starting Unit 3, Patterns within Numbers:
         counting by 1s ..."), a unit's review and test one line after it */
      var mp = project(m, from, to), lines = [], units = [], segs = [], seg = {};
      var segOf = function (n) {
        if (!seg[n]) { seg[n] = { u: n, open: false, ph: [], review: false, assess: false }; segs.push(seg[n]); }
        return seg[n];
      };
      Object.keys(mp).sort().forEach(function (k) {
        var e = mp[k]; if (!e.taught) return;
        var st = on(m) ? find(e.pos) : null;
        if (!st) { var f = OWN.fmt(m, e.pos); if (f && f !== "\u2014") segs.push({ own: "Math " + f }); return; }
        var u = unit(st.u); if (u && units.indexOf(u) < 0) units.push(u);
        if (st.k === "L") segOf(st.u).ph.push(famMath(st));
        else if (st.k === "open") segOf(st.u).open = true;
        else if (st.k === "review" || st.k === "assess") segOf(st.u)[st.k] = true;
      });
      segs.forEach(function (g) {
        if (g.own) { lines.push(g.own); return; }
        var u = unit(g.u), sum = g.ph.length ? famSummary(uniq(g.ph)) : "";
        if (g.open) lines.push("Starting Unit " + g.u + ", " + (u ? u.title : "") + (sum ? ": " + sum.charAt(0).toLowerCase() + sum.slice(1) : ""));
        else if (sum) lines.push(sum);
        if (g.review || g.assess) lines.push(g.review && g.assess ? "Unit " + g.u + " review and test"
          : g.assess ? "Unit " + g.u + " test" : "Reviewing Unit " + g.u);
      });
      lines = uniq(lines.filter(Boolean));
      if (lines.length) out.push({ head: "Math" + (units.length ? " \u00b7 " + units.map(function (u) { return "Unit " + u.u + ", " + u.title; }).join(" \u2192 ") : ""), lines: lines });
    }

    var rd = sub("reading"), pl = [];
    /* the spelling list is kept per Benchmark week, so next year that week
       already has it; with no Benchmark week to go by, per calendar week */
    var spellKey = "wk:" + from;
    if (rd && rd.on) {
      /* A calendar week often straddles two Benchmark weeks. Both at once
         was seven texts, two phonics skills and twenty sight words, too much
         for a family email, so this uses the Benchmark week that covers the
         most of this week's Reading days (a tie goes to the later one). */
      var rp = project(rd, from, to), weeks = [], count = {}, first = {};
      Object.keys(rp).sort().forEach(function (k) {
        var e = rp[k]; if (!e.taught || !e.pos) return;
        var id = e.pos.unit + "|" + e.pos.week;
        count[id] = (count[id] || 0) + 1; first[id] = first[id] || e.pos;
      });
      var best = null;
      Object.keys(count).forEach(function (id) { if (!best || count[id] >= count[best]) best = id; });
      if (best) weeks.push(first[best]);
      var bm = window.BenchmarkScope && bmOn(rd);
      /* v66, the teacher's call: no stories-and-texts line and no sight
         words; the week's spelling words, pasted into the sheet, instead */
      var rl = [], pl = [], rUnits = [], skills = [], words = [];
      if (bm && weeks[0]) spellKey = "bm:" + weeks[0].unit + "|" + weeks[0].week;
      var goalOpts = [], goal = null;
      weeks.forEach(function (p) {
        var u = bm ? window.BenchmarkScope.unit(p.unit) : null, w = bm ? window.BenchmarkScope.week(p) : null;
        if (u && rUnits.indexOf(u) < 0) rUnits.push(u);
        if (w && w.phonics && w.phonics["Primary Skill"]) skills.push(w.phonics["Primary Skill"]);
        /* v68: the week's own Tier 2 / Tier 3 words, not the unit's word
           bank, and one of the week's comprehension goals */
        if (w && w.words) words = words.concat(w.words.ga || [], w.words.ds || []);
        if (w && !goalOpts.length) goalOpts = famGoalOptions(w);
      });
      if (!words.length) rUnits.forEach(function (u) { words = words.concat(u.wordBank || []); });
      rUnits.forEach(function (u) { if (u.eq) rl.push("Our big question: " + u.eq); });
      if (goalOpts.length) {
        var saved = goalStore()[spellKey];
        goal = goalOpts.filter(function (x) { return x.src === saved; })[0] || famGoalDefault(goalOpts);
        if (goal) rl.push({ t: goal.t, goal: true });
      }
      words = uniq(words);
      if (words.length) rl.push("Words to listen for: " + words.join(", "));
      if (!bm) weeks.forEach(function (p) { rl.push("Reading " + OWN.fmt(rd, p)); });
      if (rl.length) out.push({ head: "Reading" + (rUnits.length ? " \u00b7 " + rUnits.map(function (u) { return "Unit " + u.u + ", " + u.title; }).join(" \u2192 ") : ""), id: "reading", lines: uniq(rl) });
      uniq(skills).forEach(function (x) { pl.push("Sounds and spelling: " + x); });
    }
    var spell = parseSpelling(spellingStore()[spellKey]);
    if (spell.length) pl.push({ t: spellLine(spell), spell: true });
    if (pl.length) out.push({ head: "Phonics", id: "phonics", lines: pl });

    var sc = sub("science");
    if (sc && sc.on) {
      var sp = project(sc, from, to), topics = [];
      Object.keys(sp).sort().forEach(function (k) { var e = sp[k]; if (e.taught && e.pos && e.pos.text) topics.push(String(e.pos.text).trim()); });
      topics = uniq(topics);
      if (topics.length) out.push({ head: "Science and social studies", id: "science", lines: topics });
    }
    return { from: days[0], to: days[4], sections: out, spellKey: spellKey, goalOpts: goalOpts || [], goal: goal || null };
  }
  /* ---- spelling words (v66): pasted into the sheet, one list per week ---- */
  function spellingStore() {
    var rd = sub("reading");
    return (rd && rd.spelling && typeof rd.spelling === "object") ? rd.spelling : FAM.spell || (FAM.spell = {});
  }
  /* one per line, or commas, or numbered: "1. boat", "- road", "• snow" */
  function parseSpelling(t) {
    return uniq(String(t || "").split(/[\n,;\t]+/).map(function (x) {
      return x.replace(/^\s*(?:\d+\s*[.):-]|[-\u2022*\u00b7])\s*/, "").trim();
    }).filter(Boolean));
  }
  function spellLine(words) { return "Spelling words to practice at home: " + words.join(", "); }
  function saveSpelling(k, text) {
    var rd = sub("reading");
    var st = rd ? (rd.spelling && typeof rd.spelling === "object" ? rd.spelling : (rd.spelling = {})) : spellingStore();
    if (String(text || "").trim()) st[k] = String(text); else delete st[k];
    if (rd) persistSettings();
  }
  /* put the typed list into the preview without rebuilding it, so edits
     made by hand elsewhere in it are kept */
  function patchSpelling(el, words) {
    var li = el.querySelector("[data-fam-spell]"), text = words.length ? spellLine(words) : "";
    if (li) {
      if (text) { li.textContent = text; return; }
      var ul0 = li.parentNode; li.remove();
      if (ul0 && !ul0.children.length) { var hd = ul0.previousElementSibling; ul0.remove(); if (hd && hd.hasAttribute("data-fam-head")) hd.remove(); }
      return;
    }
    if (!text) return;
    var head = el.querySelector('[data-fam-head="phonics"]'), ul = head && head.nextElementSibling && head.nextElementSibling.tagName === "UL" ? head.nextElementSibling : null;
    if (!ul) {
      head = document.createElement("p"); head.setAttribute("data-fam-head", "phonics"); head.innerHTML = "<b>Phonics</b>";
      ul = document.createElement("ul");
      var before = el.querySelector('[data-fam-head="science"]');
      if (before) { el.insertBefore(head, before); el.insertBefore(ul, before); } else { el.appendChild(head); el.appendChild(ul); }
    }
    li = document.createElement("li"); li.setAttribute("data-fam-spell", ""); li.textContent = text;
    ul.appendChild(li);
  }
  function familyHTML(r) {
    var h = "<p>Here\u2019s a peek at what we\u2019re learning the week of " + e$(mdy(r.from)) + ".</p>";
    r.sections.forEach(function (s) {
      h += (s.head ? "<p" + (s.id ? ' data-fam-head="' + s.id + '"' : "") + "><b>" + e$(s.head) + "</b></p>" : "") + "<ul>" + s.lines.map(function (l) {
        return typeof l === "object" ? "<li " + (l.goal ? "data-fam-goal" : "data-fam-spell") + ">" + e$(l.t) + "</li>" : "<li>" + e$(l) + "</li>";
      }).join("") + "</ul>";
    });
    if (!r.sections.length) h += "<p>Nothing is planned for this week yet.</p>";
    return h;
  }
  /* the editable preview as plain text, for mail that takes no formatting */
  function familyText(el) {
    var t = [];
    Array.prototype.forEach.call(el.children, function (n) {
      if (n.tagName === "UL") Array.prototype.forEach.call(n.children, function (li) { t.push("\u2022 " + li.textContent.trim()); });
      else { if (t.length) t.push(""); t.push(n.textContent.trim()); }
    });
    return t.join("\n");
  }
  function openFamily(mon) {
    FAM.start = mon || FAM.start || defaultWeek();
    var r = familySections(FAM.start);
    openSheet(
      "<h2>The week ahead, for families</h2>" +
      '<div class="fam-nav"><button class="ghost" data-fam-wk="-7" aria-label="Previous week">\u2039</button>' +
      "<b>" + e$(mdy(r.from) + " \u2013 " + mdy(r.to)) + '</b><button class="ghost" data-fam-wk="7" aria-label="Next week">\u203a</button></div>' +
      '<label class="fam-spell">This week\u2019s spelling words<textarea id="fam-spell" rows="3" placeholder="Paste the list here: one per line, or separated by commas">' +
        e$(spellingStore()[r.spellKey] || "") + "</textarea></label>" + goalPicker(r) +
      '<p class="hint">' + (/^bm:/.test(r.spellKey) ? "Kept with Benchmark Unit " + e$(r.spellKey.slice(3).replace("|", ", Week ")) + ", so it\u2019s here next year too. " : "") +
        "Built from the planner and the Reveal and Benchmark guides. Your day notes are never included. Edit anything before you copy.</p>" +
      '<div class="fam-prev" contenteditable="true" spellcheck="true">' + familyHTML(r) + "</div>" +
      '<div class="sheetbar"><button class="ghost" data-sheet-cancel>Close</button><button class="primary" data-fam-copy>Copy for email</button></div>');
    var ta = document.getElementById("fam-spell"), k = r.spellKey;
    if (ta) ta.addEventListener("input", function () {
      saveSpelling(k, ta.value);
      var el = document.querySelector("dialog.sheet .fam-prev");
      if (el) patchSpelling(el, parseSpelling(ta.value));
    });
    Array.prototype.forEach.call(document.querySelectorAll('dialog.sheet input[name="fam-goal"]'), function (rb) {
      rb.addEventListener("change", function () {
        var o = r.goalOpts[Number(rb.value)]; if (!rb.checked || !o) return;
        saveGoal(k, o.src);
        var el = document.querySelector("dialog.sheet .fam-prev");
        if (el) patchGoal(el, o.t);
      });
    });
  }
  /* the week's reading goals to choose from, in two groups as the scope
     and sequence prints them */
  function goalPicker(r) {
    if (!r.goalOpts || !r.goalOpts.length) return "";
    var h = '<fieldset class="fam-goal"><legend>This week\u2019s reading goal for families</legend>';
    [["meta", "Metacognitive and fix-up strategies"], ["comp", "Comprehension strategies"]].forEach(function (c) {
      var items = "";
      r.goalOpts.forEach(function (o, i) {
        if (o.col !== c[0]) return;
        items += '<label><input type="radio" name="fam-goal" value="' + i + '"' + (r.goal === o ? " checked" : "") + "> " + e$(o.t) + "</label>";
      });
      if (items) h += '<div class="fam-goal-col"><span>' + c[1] + "</span>" + items + "</div>";
    });
    return h + "</fieldset>";
  }
  /* swap the goal line in place, so hand edits elsewhere are kept; if it
     was deleted by hand, it goes back in under the big question */
  function patchGoal(el, text) {
    var li = el.querySelector("[data-fam-goal]");
    if (li) { li.textContent = text; return; }
    var head = el.querySelector('[data-fam-head="reading"]'), ul = head && head.nextElementSibling;
    if (!ul || ul.tagName !== "UL") return;
    li = document.createElement("li"); li.setAttribute("data-fam-goal", ""); li.textContent = text;
    var q = Array.prototype.filter.call(ul.children, function (x) { return /^Our big question:/.test(x.textContent); })[0];
    ul.insertBefore(li, q ? q.nextSibling : ul.firstChild);
  }
  function copyFamily() {
    var el = document.querySelector("dialog.sheet .fam-prev");
    if (!el) return;
    var html = el.innerHTML, text = familyText(el);
    function fallback() {
      try {
        var rg = document.createRange(); rg.selectNodeContents(el);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
        var okk = document.execCommand && document.execCommand("copy");
        toast(okk ? "Copied. Paste it into your email." : "Selected. Copy it with \u2318C or Ctrl+C.");
      } catch (x) { toast("Select the text and copy it."); }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        })]).then(function () { toast("Copied. Paste it into your email."); }, fallback);
        return;
      }
    } catch (x) { }
    fallback();
  }
  if (typeof window.renderWeek === "function") {
    var ownWeek = window.renderWeek;
    window.renderWeek = function () {
      ownWeek.apply(this, arguments);
      try {
        var nav = main.querySelector(".datenav");
        if (nav && !main.querySelector("[data-fam]")) {
          var bar = document.createElement("div");
          bar.className = "fam-bar";
          bar.innerHTML = '<button class="ghost" data-fam>Week ahead for families</button>';
          nav.insertAdjacentElement("afterend", bar);
        }
      } catch (x) { }
    };
  }
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target : null;
    if (!t) return;
    if (t.closest("[data-fam]")) { FAM.start = defaultWeek(); openFamily(FAM.start); return; }
    var wk = t.closest("[data-fam-wk]");
    if (wk) { openFamily(addDays(FAM.start, Number(wk.dataset.famWk))); return; }
    if (t.closest("[data-fam-copy]")) copyFamily();
  });
  css.textContent +=
    ".fam-bar{display:flex;justify-content:flex-end;margin:-4px 0 12px}" +
    ".fam-spell{display:flex;flex-direction:column;gap:4px;margin:4px 0 6px;font-size:13px;font-weight:600;color:var(--ink-2)}" +
    ".fam-spell textarea{font:inherit;font-weight:400;font-size:14.5px;color:var(--ink);background:var(--card);border:1.5px solid var(--line-2);border-radius:8px;padding:8px 10px;resize:vertical;max-width:100%;box-sizing:border-box}" +
    ".fam-goal{border:0;margin:6px 0 8px;padding:0;min-width:0}" +
    ".fam-goal legend{font-size:13px;font-weight:600;color:var(--ink-2);padding:0;margin-bottom:4px}" +
    ".fam-goal-col{display:flex;flex-direction:column;gap:2px;margin:2px 0 6px}" +
    ".fam-goal-col span{font-size:12.5px;color:var(--ink-3)}" +
    ".fam-goal label{display:flex;align-items:flex-start;gap:8px;font-size:14.5px;color:var(--ink);line-height:1.35;padding:5px 0;min-height:32px;box-sizing:border-box}" +
    ".fam-goal input{margin:2px 0 0;flex:none;width:18px;height:18px}" +
    ".fam-nav{display:flex;align-items:center;gap:10px;margin:2px 0 8px;font-size:14.5px}" +
    ".fam-prev{border:1.5px solid var(--line-2);border-radius:10px;padding:10px 14px;background:var(--card);color:var(--ink);font-family:var(--body);font-size:14.5px;line-height:1.5;max-height:52vh;overflow:auto;overflow-wrap:anywhere}" +
    ".fam-prev p{margin:8px 0 2px}.fam-prev ul{margin:2px 0 6px;padding-left:20px}.fam-prev li{margin:2px 0}" +
    ".fam-prev:focus{outline:2px solid var(--ink-3);outline-offset:2px}";

  /* The planner boots asynchronously. If it has already drawn, draw again
     so Math picks all of this up; if not, its first render will. */
  try {
    if (S && S.subjects && S.subjects.length && typeof render === "function") {
      /* a suggested draft built before this loaded used the old stepper;
         one that has not been touched or saved is simply built again */
      if (draft && !draft.saved && !dirty && !(PENDING && PENDING[draft.__key])) draft = null;
      render();
    }
  } catch (x) { }
})();
