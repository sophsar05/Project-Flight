// Principles of Flight — 60 PPL questions (PPM CH.3)
// Supabase-compatible object format; merged into state.allQuestions at boot

export const principlesOfFlightQuestions = [
  // ── Four Forces ───────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Four Forces', subtopic: 'Force Equilibrium',
    question: 'During unaccelerated straight-and-level flight, which relationship exists among the aerodynamic forces?',
    option_a: 'Lift exceeds weight and thrust exceeds drag',
    option_b: 'Weight exceeds lift and drag exceeds thrust',
    option_c: 'Lift equals weight and thrust equals drag',
    option_d: 'Lift equals drag and thrust equals weight',
    correct_option: 'C',
    discussion: 'In straight-and-level unaccelerated flight, all forces are balanced. Lift equals weight, while thrust equals drag.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Angle of Attack / Stall ───────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Angle of Attack', subtopic: 'Angle of Attack Definition',
    question: 'The angle between the wing chord line and the relative wind is known as the:',
    option_a: 'Angle of incidence', option_b: 'Flight path angle',
    option_c: 'Pitch angle', option_d: 'Angle of attack',
    correct_option: 'D',
    discussion: 'Angle of attack is the angle formed between the wing chord line and the relative wind and is critical to lift production.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stall', subtopic: 'Stall Causes',
    question: 'A wing stalls when:',
    option_a: 'Airspeed decreases below maneuvering speed',
    option_b: 'Parasite drag exceeds induced drag',
    option_c: 'The critical angle of attack is exceeded',
    option_d: 'The aircraft exceeds its maximum gross weight',
    correct_option: 'C',
    discussion: 'A stall occurs when airflow separates from the wing after exceeding the critical angle of attack.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Bernoulli / Lift ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Lift', subtopic: "Bernoulli's Principle",
    question: "Which statement best describes Bernoulli's Principle as applied to an airfoil?",
    option_a: 'Faster airflow produces greater pressure',
    option_b: 'Slower airflow reduces lift',
    option_c: 'Equal airflow above and below the wing creates lift',
    option_d: 'Faster airflow over the wing results in lower pressure',
    correct_option: 'D',
    discussion: "Bernoulli's Principle states that as airflow velocity increases, pressure decreases, helping create lift.",
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Drag ──────────────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Induced Drag',
    question: 'Which type of drag is directly associated with lift production?',
    option_a: 'Parasite drag', option_b: 'Form drag',
    option_c: 'Skin friction drag', option_d: 'Induced drag',
    correct_option: 'D',
    discussion: 'Induced drag is produced whenever lift is generated and becomes greatest at low airspeeds.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Parasite Drag',
    question: 'Parasite drag generally becomes most significant at:',
    option_a: 'Low airspeeds and high angles of attack',
    option_b: 'Stall speed',
    option_c: 'High airspeeds',
    option_d: 'Maximum gross weight only',
    correct_option: 'C',
    discussion: 'Parasite drag increases rapidly as airspeed increases due to greater air resistance.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Lift ──────────────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Lift', subtopic: 'Direction of Lift',
    question: 'Which aerodynamic force acts perpendicular to the relative wind?',
    option_a: 'Drag', option_b: 'Weight',
    option_c: 'Thrust', option_d: 'Lift',
    correct_option: 'D',
    discussion: 'Lift acts at a right angle to the relative wind and supports the aircraft in flight.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Axes of Flight ────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Axes of Flight', subtopic: 'Longitudinal Axis',
    question: 'Which axis runs longitudinally through the aircraft from nose to tail?',
    option_a: 'Lateral axis', option_b: 'Vertical axis',
    option_c: 'Longitudinal axis', option_d: 'Horizontal axis',
    correct_option: 'C',
    discussion: 'The longitudinal axis extends from nose to tail and is associated with roll movement.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },
  {
    id: null, module: 'Principles of Flight',
    topic: 'Axes of Flight', subtopic: 'Roll',
    question: 'Roll movement occurs around the:',
    option_a: 'Vertical axis', option_b: 'Lateral axis',
    option_c: 'Pitch axis', option_d: 'Longitudinal axis',
    correct_option: 'D',
    discussion: "Rolling motion occurs around the aircraft's longitudinal axis and is controlled by ailerons.",
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },
  {
    id: null, module: 'Principles of Flight',
    topic: 'Axes of Flight', subtopic: 'Yaw',
    question: 'Yaw movement occurs around the:',
    option_a: 'Longitudinal axis', option_b: 'Lateral axis',
    option_c: 'Vertical axis', option_d: 'Horizontal axis',
    correct_option: 'C',
    discussion: 'Yaw is movement around the vertical axis and is controlled primarily by the rudder.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Control Surfaces ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Control Surfaces', subtopic: 'Pitch Control',
    question: 'Which control surface primarily controls pitch?',
    option_a: 'Rudder', option_b: 'Ailerons',
    option_c: 'Spoilers', option_d: 'Elevator',
    correct_option: 'D',
    discussion: "The elevator controls pitch by changing the aircraft's nose attitude.",
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },
  {
    id: null, module: 'Principles of Flight',
    topic: 'Control Surfaces', subtopic: 'Adverse Yaw',
    question: 'Adverse yaw is caused mainly by:',
    option_a: 'Excessive elevator back pressure',
    option_b: 'Unequal lift between the wings',
    option_c: 'Unequal drag created by aileron deflection',
    option_d: 'Improper trim settings',
    correct_option: 'C',
    discussion: 'The downward aileron produces more drag, causing the aircraft to yaw opposite the direction of roll.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stability ─────────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stability', subtopic: 'Lateral Stability',
    question: 'Wing dihedral contributes primarily to:',
    option_a: 'Directional stability', option_b: 'Longitudinal stability',
    option_c: 'Lateral stability', option_d: 'Structural efficiency only',
    correct_option: 'C',
    discussion: 'Dihedral helps the aircraft naturally return to level flight after a rolling disturbance.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Drag (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Induced Drag',
    question: 'Which condition would increase induced drag?',
    option_a: 'High-speed cruise flight',
    option_b: 'Descending at low angle of attack',
    option_c: 'Low airspeed with high angle of attack',
    option_d: 'Flying in smooth air only',
    correct_option: 'C',
    discussion: 'Induced drag increases significantly during slow flight because the wing must produce more lift.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Lift (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Lift', subtopic: 'Center of Pressure',
    question: 'The center of pressure is defined as the point where:',
    option_a: 'Aircraft weight acts',
    option_b: 'The thrust line intersects the fuselage',
    option_c: 'Total aerodynamic force is considered concentrated',
    option_d: 'Maximum lift is always generated',
    correct_option: 'C',
    discussion: 'The center of pressure is the point where all aerodynamic lift forces are assumed to act.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Load Factor / Turns ───────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Load Factor', subtopic: 'Load Factor and Stall',
    question: 'Which statement concerning load factor is correct?',
    option_a: 'Load factor decreases stall speed',
    option_b: 'Load factor only applies during turbulence',
    option_c: 'Increasing load factor increases stall speed',
    option_d: 'Load factor is unrelated to aircraft structure',
    correct_option: 'C',
    discussion: 'As load factor increases, the wing must produce more lift, causing stall speed to rise.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Ground Effect / Vortices ──────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Ground Effect', subtopic: 'Ground Effect Basics',
    question: 'Ground effect primarily reduces:',
    option_a: 'Parasite drag', option_b: 'Weight',
    option_c: 'Thrust', option_d: 'Induced drag',
    correct_option: 'D',
    discussion: 'Ground effect weakens wingtip vortices and reduces induced drag near the surface.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Spin ─────────────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stall', subtopic: 'Spin Development',
    question: 'A spin develops when an aircraft:',
    option_a: 'Experiences excessive parasite drag',
    option_b: 'Stalls with one wing more stalled than the other',
    option_c: 'Enters a steep coordinated turn',
    option_d: 'Exceeds maximum structural speed',
    correct_option: 'B',
    discussion: 'A spin occurs from an aggravated stall where one wing loses lift more deeply than the other.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stability (continued) ─────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stability', subtopic: 'Static Stability',
    question: 'Which statement regarding stability is correct?',
    option_a: 'Stable aircraft are impossible to maneuver',
    option_b: 'Stability is the tendency of an aircraft to return to equilibrium',
    option_c: 'Stability only refers to yaw control',
    option_d: 'Instability always improves performance',
    correct_option: 'B',
    discussion: 'Stability helps the aircraft maintain or return to a desired flight condition after disturbance.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Turns ─────────────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Turns', subtopic: 'Coordinated Turns',
    question: 'In a properly coordinated level turn:',
    option_a: 'Only the rudder is required',
    option_b: 'The vertical component of lift decreases to zero',
    option_c: 'The horizontal component of lift causes the turn',
    option_d: 'Drag becomes less than thrust automatically',
    correct_option: 'C',
    discussion: 'Tilting the lift vector during a bank creates a horizontal component that turns the aircraft.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stability (continued) ─────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stability', subtopic: 'Directional Stability',
    question: 'The tendency of an aircraft to resist displacement about its vertical axis is called:',
    option_a: 'Longitudinal stability', option_b: 'Lateral stability',
    option_c: 'Directional stability', option_d: 'Dynamic instability',
    correct_option: 'C',
    discussion: 'Directional stability keeps the aircraft aligned with the relative wind and resists yawing motion.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Angle of Attack (continued) ───────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Lift', subtopic: 'Lift Generation',
    question: 'Which factor has the greatest effect on lift generation?',
    option_a: 'Cabin pressure', option_b: 'Fuel grade',
    option_c: 'Angle of attack', option_d: 'Paint thickness',
    correct_option: 'C',
    discussion: 'Angle of attack is the primary factor affecting lift production until the critical angle is reached.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },
  {
    id: null, module: 'Principles of Flight',
    topic: 'Lift', subtopic: 'Airflow Over Wing',
    question: 'The airflow over the top of a wing normally travels:',
    option_a: 'Slower than airflow beneath the wing',
    option_b: 'At exactly the same speed as airflow beneath the wing',
    option_c: 'Backward relative to the airflow beneath the wing',
    option_d: 'Faster than airflow beneath the wing',
    correct_option: 'D',
    discussion: 'Faster airflow over the upper wing surface creates lower pressure, contributing to lift.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Drag (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Induced Drag',
    question: 'Which statement about induced drag is correct?',
    option_a: 'It increases as airspeed increases',
    option_b: 'It is unrelated to lift',
    option_c: 'It decreases as airspeed increases',
    option_d: 'It is greatest during cruise flight',
    correct_option: 'C',
    discussion: 'Induced drag is highest at low speeds and decreases as airspeed increases.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Load Factor (continued) ───────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Load Factor', subtopic: 'Steep Turns',
    question: 'A pilot increases back pressure while maintaining altitude in a steep turn. The load factor will:',
    option_a: 'Decrease', option_b: 'Remain unchanged',
    option_c: 'Become negative', option_d: 'Increase',
    correct_option: 'D',
    discussion: "Steeper bank angles require more lift, increasing the aircraft's load factor.",
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Control Surfaces (continued) ──────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Control Surfaces', subtopic: 'Flaps',
    question: 'The purpose of wing flaps during landing is primarily to:',
    option_a: 'Decrease drag and increase airspeed',
    option_b: 'Improve directional stability',
    option_c: 'Increase lift and drag at lower speeds',
    option_d: "Reduce the aircraft's weight",
    correct_option: 'C',
    discussion: 'Flaps allow slower approach speeds while increasing drag for steeper descents.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stability (continued) ─────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stability', subtopic: 'Lateral Stability',
    question: "Which type of stability involves the aircraft's tendency to return to level flight after a roll disturbance?",
    option_a: 'Directional stability', option_b: 'Longitudinal stability',
    option_c: 'Lateral stability', option_d: 'Spiral instability',
    correct_option: 'C',
    discussion: 'Lateral stability resists rolling motion and helps return the wings to level.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Turns (continued) ─────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Turns', subtopic: 'Coordinated Turns',
    question: 'A coordinated turn requires the proper balance of:',
    option_a: 'Elevator and trim', option_b: 'Power and drag',
    option_c: 'Aileron and rudder input', option_d: 'Flaps and thrust',
    correct_option: 'C',
    discussion: 'Proper rudder coordination prevents adverse yaw during turns.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stall (continued) ─────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stall', subtopic: 'Stall Causes',
    question: 'Which condition is most likely to produce a stall?',
    option_a: 'Low power setting only',
    option_b: 'Exceeding the critical angle of attack',
    option_c: 'Flying below maneuvering speed only',
    option_d: 'High-density altitude only',
    correct_option: 'B',
    discussion: 'A stall is caused by excessive angle of attack, regardless of airspeed.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Turns (continued) ─────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Turns', subtopic: 'Horizontal Component of Lift',
    question: 'The horizontal component of lift in a turn causes the aircraft to:',
    option_a: 'Climb', option_b: 'Descend',
    option_c: 'Stall', option_d: 'Change direction',
    correct_option: 'D',
    discussion: 'Banking tilts the lift vector, producing horizontal lift that turns the aircraft.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Drag (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Induced Drag',
    question: 'Which drag component becomes dominant during slow flight?',
    option_a: 'Parasite drag', option_b: 'Skin friction drag',
    option_c: 'Form drag', option_d: 'Induced drag',
    correct_option: 'D',
    discussion: 'Slow flight requires higher angles of attack, increasing induced drag.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stall (continued) ─────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stall', subtopic: 'Critical Angle of Attack',
    question: 'The critical angle of attack for a particular wing:',
    option_a: 'Changes with aircraft weight',
    option_b: 'Changes with airspeed',
    option_c: 'Depends entirely on load factor',
    option_d: 'Remains essentially constant',
    correct_option: 'D',
    discussion: 'The critical angle of attack is a fixed aerodynamic limit for a given wing design.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Axes of Flight (continued) ────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Axes of Flight', subtopic: 'Pitch',
    question: "Which motion occurs around the aircraft's lateral axis?",
    option_a: 'Roll', option_b: 'Yaw',
    option_c: 'Pitch', option_d: 'Slip',
    correct_option: 'C',
    discussion: 'Pitch movement causes the nose to move up or down around the lateral axis.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Control Surfaces (continued) ──────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Control Surfaces', subtopic: 'Trim Tabs',
    question: 'What is the primary purpose of trim tabs?',
    option_a: 'Increase thrust', option_b: 'Reduce drag significantly',
    option_c: 'Improve stall recovery', option_d: 'Reduce pilot control pressure',
    correct_option: 'D',
    discussion: 'Trim tabs help maintain a desired attitude without continuous control input.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Four Forces (continued) ───────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Four Forces', subtopic: 'Climb Forces',
    question: 'During a climb, assuming no acceleration, which force relationship exists?',
    option_a: 'Drag exceeds thrust', option_b: 'Lift exceeds weight',
    option_c: 'Thrust exceeds drag', option_d: 'Weight equals zero',
    correct_option: 'C',
    discussion: "To maintain a climb, thrust must overcome drag while lift supports most of the aircraft's weight.",
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Drag (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Parasite Drag',
    question: 'Which statement best describes parasite drag?',
    option_a: 'It is caused by lift production',
    option_b: 'It decreases rapidly with speed',
    option_c: 'It consists of form, interference, and skin friction drag',
    option_d: 'It is greatest during stalls',
    correct_option: 'C',
    discussion: 'Parasite drag includes all drag not directly related to lift generation.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Ground Effect / Vortices (continued) ─────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Wake Turbulence', subtopic: 'Wingtip Vortices',
    question: 'Wingtip vortices are strongest when the aircraft is:',
    option_a: 'Heavy, clean, and fast', option_b: 'Light and slow',
    option_c: 'Heavy, slow, and clean', option_d: 'Fast with flaps extended',
    correct_option: 'C',
    discussion: 'High lift conditions create stronger vortices, especially at low speeds and heavy weights.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stall / Spin ─────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stall', subtopic: 'Spin Causes',
    question: 'Which condition would most likely result in a spin?',
    option_a: 'Coordinated steep turn', option_b: 'Uncoordinated stall',
    option_c: 'Straight-and-level flight', option_d: 'High-speed descent',
    correct_option: 'B',
    discussion: 'Spins usually result from stalls combined with yaw or uncoordinated flight.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stability (continued) ─────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stability', subtopic: 'Dynamic Stability',
    question: 'Dynamic stability refers to:',
    option_a: 'Initial resistance to displacement',
    option_b: 'How the aircraft reacts over time after disturbance',
    option_c: "The aircraft's maneuverability",
    option_d: 'Engine performance during turbulence',
    correct_option: 'B',
    discussion: "Dynamic stability describes the aircraft's motion and tendency after being disturbed.",
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Axes of Flight (continued) ────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Axes of Flight', subtopic: 'Vertical Axis',
    question: 'Which axis passes vertically through the aircraft?',
    option_a: 'Longitudinal axis', option_b: 'Lateral axis',
    option_c: 'Horizontal axis', option_d: 'Vertical axis',
    correct_option: 'D',
    discussion: 'The vertical axis runs top-to-bottom through the aircraft and is associated with yaw.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Load Factor (continued) ───────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Load Factor', subtopic: 'Bank Angle',
    question: 'As bank angle increases in level flight, the total lift required:',
    option_a: 'Decreases', option_b: 'Remains constant',
    option_c: 'Increases', option_d: 'Equals thrust',
    correct_option: 'C',
    discussion: 'Banking tilts lift, so additional total lift is needed to maintain altitude.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Control Surfaces (continued) ──────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Control Surfaces', subtopic: 'Ailerons',
    question: 'The downward-deflected aileron produces:',
    option_a: 'Less lift and less drag', option_b: 'More lift and more drag',
    option_c: 'More lift and less drag', option_d: 'Less lift and more drag',
    correct_option: 'B',
    discussion: 'The lowered aileron increases camber, producing greater lift and drag.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stall (continued) ─────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Load Factor', subtopic: 'Load Factor and Stall Speed',
    question: 'Which factor directly affects stall speed?',
    option_a: 'Paint color', option_b: 'Number of passengers only',
    option_c: 'Load factor', option_d: 'Cabin ventilation',
    correct_option: 'C',
    discussion: "Higher load factors increase the wing's required lift and raise stall speed.",
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Pitch Attitude ────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Axes of Flight', subtopic: 'Pitch Attitude',
    question: "The angle between the aircraft's longitudinal axis and the horizon is called:",
    option_a: 'Angle of attack', option_b: 'Angle of incidence',
    option_c: 'Pitch attitude', option_d: 'Relative wind angle',
    correct_option: 'C',
    discussion: 'Pitch attitude describes the nose position relative to the horizon.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Airflow ───────────────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Laminar Flow',
    question: 'The airflow pattern that produces the least drag is:',
    option_a: 'Turbulent flow', option_b: 'Reverse flow',
    option_c: 'Circular flow', option_d: 'Laminar flow',
    correct_option: 'D',
    discussion: 'Laminar airflow is smooth and efficient, minimizing aerodynamic drag.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Lift (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Four Forces', subtopic: 'Lift vs Weight',
    question: 'If lift becomes less than weight during flight, the aircraft will:',
    option_a: 'Accelerate upward', option_b: 'Maintain altitude',
    option_c: 'Descend', option_d: 'Immediately stall',
    correct_option: 'C',
    discussion: 'When lift is insufficient to balance weight, the aircraft loses altitude.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Drag (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Direction of Drag',
    question: 'Which aerodynamic force acts parallel and opposite to the flight path?',
    option_a: 'Lift', option_b: 'Weight',
    option_c: 'Thrust', option_d: 'Drag',
    correct_option: 'D',
    discussion: "Drag opposes the aircraft's forward movement through the air.",
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Turns (continued) ─────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Turns', subtopic: 'Skids and Slips',
    question: 'A skid occurs when the aircraft is:',
    option_a: 'Yawed toward the inside of the turn',
    option_b: 'Perfectly coordinated',
    option_c: 'Yawed toward the outside of the turn',
    option_d: 'Stalled symmetrically',
    correct_option: 'C',
    discussion: 'A skid results from excessive rudder input in the direction of the turn.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Four Forces (continued) ───────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Four Forces', subtopic: 'Force Equilibrium',
    question: 'Which condition best represents equilibrium in flight?',
    option_a: 'Lift exceeds drag', option_b: 'Drag exceeds thrust',
    option_c: 'All opposing forces are balanced', option_d: 'Weight equals thrust',
    correct_option: 'C',
    discussion: 'Equilibrium occurs when lift equals weight and thrust equals drag.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Control Surfaces (continued) ──────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Control Surfaces', subtopic: 'Spoilers',
    question: 'The primary purpose of spoilers on some aircraft is to:',
    option_a: 'Increase lift during takeoff', option_b: 'Improve engine cooling',
    option_c: 'Reduce induced drag', option_d: 'Reduce lift and increase drag',
    correct_option: 'D',
    discussion: 'Spoilers disrupt airflow over the wing, reducing lift and slowing the aircraft.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Drag (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Parasite Drag',
    question: 'Which factor primarily determines the amount of parasite drag?',
    option_a: 'Angle of attack only', option_b: 'Weight only',
    option_c: 'Aircraft airspeed', option_d: 'Engine RPM only',
    correct_option: 'C',
    discussion: 'Parasite drag rises significantly as airspeed increases.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Wake Turbulence / Vortices ────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Wake Turbulence', subtopic: 'Wingtip Vortices',
    question: 'The movement of air around the wingtip from high pressure to low pressure creates:',
    option_a: 'Shock waves', option_b: 'Slipstream rotation',
    option_c: 'Wingtip vortices', option_d: 'Compressibility effects',
    correct_option: 'C',
    discussion: 'Pressure differences around the wingtip create rotating vortices behind the aircraft.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Four Forces / Thrust ──────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Four Forces', subtopic: 'Thrust Requirements',
    question: 'In straight-and-level flight, increasing angle of attack while maintaining altitude generally requires:',
    option_a: 'Less induced drag', option_b: 'More thrust',
    option_c: 'Lower lift production', option_d: 'Reduced load factor',
    correct_option: 'B',
    discussion: 'Higher angles of attack create more induced drag, requiring additional thrust.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stall (continued) ─────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stall', subtopic: 'Stall Characteristics',
    question: 'Which statement about a stall is correct?',
    option_a: 'It only occurs at low airspeeds',
    option_b: 'It occurs when thrust exceeds drag',
    option_c: 'It can occur at any airspeed',
    option_d: 'It is caused only by excessive weight',
    correct_option: 'C',
    discussion: 'A stall depends on angle of attack, not a specific airspeed.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Four Forces (continued) ───────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Four Forces', subtopic: 'Weight',
    question: 'The force that pulls the aircraft toward Earth is:',
    option_a: 'Lift', option_b: 'Drag',
    option_c: 'Thrust', option_d: 'Weight',
    correct_option: 'D',
    discussion: 'Weight is the force of gravity acting downward on the aircraft.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Drag (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Drag', subtopic: 'Induced Drag',
    question: 'Which flight condition produces the lowest induced drag?',
    option_a: 'Slow flight', option_b: 'High angle of attack',
    option_c: 'High-speed cruise', option_d: 'Steep climbing turns',
    correct_option: 'C',
    discussion: 'Induced drag decreases as airspeed increases and angle of attack decreases.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Stability (continued) ─────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Stability', subtopic: 'Directional Stability',
    question: 'What is the primary aerodynamic purpose of the vertical stabilizer?',
    option_a: 'Produce lift', option_b: 'Control pitch',
    option_c: 'Provide directional stability', option_d: 'Reduce induced drag',
    correct_option: 'C',
    discussion: 'The vertical stabilizer helps keep the aircraft aligned with the relative wind.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Load Factor (continued) ───────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Load Factor', subtopic: 'Load Factor Definition',
    question: 'The ratio between total lift and aircraft weight is known as:',
    option_a: 'Aspect ratio', option_b: 'Lift coefficient',
    option_c: 'Load factor', option_d: 'Pressure ratio',
    correct_option: 'C',
    discussion: 'Load factor expresses aerodynamic load compared to aircraft weight.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Turns (continued) ─────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Turns', subtopic: 'Skids and Slips',
    question: 'A slip is characterized by the aircraft being:',
    option_a: 'Yawed toward the outside of the turn',
    option_b: 'Perfectly coordinated',
    option_c: 'Yawed toward the inside of the turn',
    option_d: 'In a stalled condition',
    correct_option: 'C',
    discussion: 'A slip occurs when insufficient rudder is applied for the amount of bank.',
    difficulty: 2, skill_tag: null, question_type: 'multiple_choice',
  },

  // ── Lift (continued) ──────────────────────────────────────────────────────
  {
    id: null, module: 'Principles of Flight',
    topic: 'Lift', subtopic: 'Lift Direction',
    question: 'Which statement best describes lift?',
    option_a: 'It acts parallel to the relative wind',
    option_b: 'It always exceeds weight during flight',
    option_c: 'It acts perpendicular to the relative wind',
    option_d: 'It is created only by engine thrust',
    correct_option: 'C',
    discussion: 'Lift is the aerodynamic force acting perpendicular to the relative wind and supports the aircraft in flight.',
    difficulty: 1, skill_tag: null, question_type: 'multiple_choice',
  },
];
