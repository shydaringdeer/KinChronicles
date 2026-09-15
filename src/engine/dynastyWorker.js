// src/engine/dynastyWorker.js

self.onmessage = function (e) {
  const {
    yearsToSimulate,
    foundingFirstName,
    foundingLastName,
    minMarriageAge,
    allowPolygamy,
    interwovenProbability,
    successionLaw,
    lifeExpectancy,
    fertilityModifier,
    maleNames,
    femaleNames,
    dynastyNames
  } = e.data;

  let nodes = [];
  let edges = [];
  let events = [];
  let nameCounts = {}; // Track names of title holders
  
  const generateId = () => 'sim_' + Math.random().toString(36).substring(2, 9);
  
  const toRoman = (num) => {
    const lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
    let roman = '', i;
    for ( i in lookup ) {
      while ( num >= lookup[i] ) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman;
  };

  const getRegnalName = (firstName) => {
    nameCounts[firstName] = (nameCounts[firstName] || 0) + 1;
    const num = nameCounts[firstName];
    return num > 1 ? `${firstName} ${toRoman(num)}` : firstName;
  };
  
  // Create founding couple
  let founder = {
    id: generateId(),
    type: 'person',
    data: {
      firstName: foundingFirstName || 'Aegon',
      lastName: foundingLastName || 'Targaryen',
      gender: 'male',
      birthYear: 0,
      deathYear: null,
      titles: 'Head of House',
      regnalName: getRegnalName(foundingFirstName || 'Aegon'),
      reignStart: 0,
      reignEnd: null,
      isFounder: true,
      isMainBranch: true
    },
    position: { x: 0, y: 0 }
  };
  
  let founderSpouse = {
    id: generateId(),
    type: 'person',
    data: {
      firstName: 'Visenya',
      lastName: foundingLastName || 'Targaryen',
      gender: 'female',
      birthYear: 0,
      deathYear: null,
      titles: '',
      isMainBranch: true
    },
    position: { x: 0, y: 0 }
  };
  
  nodes.push(founder, founderSpouse);
  edges.push({
    id: `e-${founder.id}-${founderSpouse.id}`,
    source: founder.id,
    sourceHandle: 'right',
    target: founderSpouse.id,
    targetHandle: 'left',
    type: 'smoothstep',
    data: { relationType: 'married' }
  });

  events.push({ year: 0, text: `${founder.data.regnalName} ${founder.data.lastName} founded the dynasty.` });
  events.push({ year: 0, text: `${founder.data.regnalName} ${founder.data.lastName} married ${founderSpouse.data.firstName} ${founderSpouse.data.lastName}.` });

  let livingNodes = [founder, founderSpouse];
  let titleHolder = founder;
  
  const resolveSuccession = (deceased, currentYear) => {
    // Collect biological children of deceased
    const childrenIds = edges
      .filter(e => e.source === deceased.id && e.sourceHandle === 'bottom')
      .map(e => e.target);
      
    let heirs = nodes.filter(n => childrenIds.includes(n.id) && n.data.deathYear === null);
    
    if (heirs.length === 0) return null; // In a full version, we'd traverse up to siblings
    
    // Sort heirs by age (birthYear) ascending
    heirs.sort((a, b) => a.data.birthYear - b.data.birthYear);
    
    if (successionLaw === 'agnatic') {
      const males = heirs.filter(h => h.data.gender === 'male');
      if (males.length > 0) return males[0];
      return heirs[0]; // fallback
    } else if (successionLaw === 'absolute') {
      return heirs[0];
    } else if (successionLaw === 'ultimogeniture') {
      return heirs[heirs.length - 1];
    } else { // male-preference
      const males = heirs.filter(h => h.data.gender === 'male');
      if (males.length > 0) return males[0];
      return heirs[0];
    }
  };

  const markMainBranch = (newHead) => {
    nodes.forEach(n => n.data.isMainBranch = false);
    if (!newHead) return;
    newHead.data.isMainBranch = true;
    
    // Mark spouses
    const spouseIds = edges.filter(e => e.data?.relationType === 'married' && (e.source === newHead.id || e.target === newHead.id))
      .map(e => e.source === newHead.id ? e.target : e.source);
    spouseIds.forEach(id => {
      const s = nodes.find(n => n.id === id);
      if (s) s.data.isMainBranch = true;
    });

    // Mark existing children
    const childIds = edges.filter(e => e.data?.relationType === 'biological' && e.source === newHead.id)
      .map(e => e.target);
    childIds.forEach(id => {
      const c = nodes.find(n => n.id === id);
      if (c) c.data.isMainBranch = true;
    });
  };

  const getAge = (n, currentYear) => currentYear - n.data.birthYear;

  const defaultMale = ["Aenys", "Maegor", "Jaehaerys", "Viserys", "Daemon", "Aemond", "Lucerys", "Jacaerys", "Aegon", "Baelor", "Daeron"];
  const defaultFemale = ["Rhaenys", "Alyssa", "Rhaena", "Alysanne", "Rhaenyra", "Helaena", "Baela", "Rhaena", "Daenerys", "Naerys"];
  const defaultDynasty = ["Stark", "Lannister", "Targaryen", "Baratheon", "Tyrell", "Martell", "Tully", "Arryn"];

  const getRandomName = (type) => {
    let list;
    if (type === 'male') list = maleNames || defaultMale;
    else if (type === 'female') list = femaleNames || defaultFemale;
    else list = dynastyNames || defaultDynasty;
    return list[Math.floor(Math.random() * list.length)];
  };

  const getDeathCause = (node, age) => {
    const gender = node.data.gender;
    const isHead = node.data.titles === 'Head of House';
    const causes = [];
    
    if (age < 5) {
      causes.push("died in infancy", "succumbed to a childhood fever", "died of the pox");
    } else {
      if (age >= 60) {
        causes.push("died of old age", "passed away peacefully in their sleep", "died of a failing heart");
      }
      if (gender === 'female' && age >= 16 && age <= 45) {
        causes.push("died in childbirth", "succumbed to childbed fever");
      }
      if (gender === 'male' && age >= 16 && age <= 50) {
        causes.push("died in battle", "was killed in a duel", "died in a hunting accident");
      }
      if (isHead) {
        causes.push("was assassinated", "was poisoned by their enemies", "was murdered in their bed");
      }
      causes.push(
        "succumbed to a sudden illness", 
        "died of a mysterious fever", 
        "fell from a horse and broke their neck",
        "choked at a feast",
        "was lost at sea"
      );
    }
    
    return causes[Math.floor(Math.random() * causes.length)];
  };

  for (let year = 1; year <= yearsToSimulate; year++) {
    // 1. Mortality Check
    livingNodes.forEach(n => {
      const age = getAge(n, year);
      let deathChance = 0;
      if (age > 30) deathChance += 0.005;
      if (age > 50) deathChance += 0.02;
      if (age > lifeExpectancy - 10) deathChance += 0.05;
      if (age > lifeExpectancy) deathChance += 0.15;
      if (age > lifeExpectancy + 15) deathChance += 0.4;
      
      if (Math.random() < deathChance) {
        n.data.deathYear = year;
        const nameToUse = n.data.regnalName ? n.data.regnalName : n.data.firstName;
        const cause = getDeathCause(n, age);
        events.push({ year, text: `${nameToUse} ${n.data.lastName} ${cause} at age ${age}.` });
        
        // Inheritance Trigger
        if (n.id === titleHolder?.id) {
          n.data.reignEnd = year;
          const heir = resolveSuccession(n, year);
          if (heir) {
            heir.data.titles = 'Head of House';
            heir.data.reignStart = year;
            heir.data.regnalName = getRegnalName(heir.data.firstName);
            markMainBranch(heir);
            titleHolder = heir;
            events.push({ year, text: `${heir.data.regnalName} ${heir.data.lastName} ascended as the new Head of House.` });
          } else {
            titleHolder = null;
            markMainBranch(null);
            events.push({ year, text: `The dynasty of House ${foundingLastName} has fallen. No heirs remain.` });
          }
        }
      }
    });
    
    livingNodes = nodes.filter(n => n.data.deathYear === null);
    
    // 2. Marriage
    const adults = livingNodes.filter(n => getAge(n, year) >= minMarriageAge);
    const unmarried = adults.filter(n => {
      if (allowPolygamy && n.data.gender === 'male') return true; 
      return !edges.some(e => e.data?.relationType === 'married' && (e.source === n.id || e.target === n.id));
    });
    
    const availableMen = unmarried.filter(n => n.data.gender === 'male');
    const availableWomen = unmarried.filter(n => n.data.gender === 'female');
    
    availableMen.forEach(m => {
      const marryChance = m.data.isMainBranch ? 0.2 : 0.02; // 10x less likely for cadet branches
      if (Math.random() < marryChance) {
        let w = null;
        if (availableWomen.length > 0 && Math.random() < interwovenProbability) {
          // Marry relative (interwoven)
          w = availableWomen.pop();
        } else {
          // Generate new spouse from outside
          w = {
            id: generateId(),
            type: 'person',
            data: {
              firstName: getRandomName('female'),
              lastName: getRandomName('dynasty'),
              gender: 'female',
              birthYear: year - minMarriageAge,
              deathYear: null,
              isMainBranch: m.data.isMainBranch
            },
            position: { x: 0, y: 0 }
          };
          nodes.push(w);
          livingNodes.push(w);
        }
        
        if (w) {
          edges.push({
            id: `e-${m.id}-${w.id}`,
            source: m.id,
            sourceHandle: 'right',
            target: w.id,
            targetHandle: 'left',
            type: 'smoothstep',
            data: { relationType: 'married' }
          });
          events.push({ year, text: `${m.data.firstName} ${m.data.lastName} married ${w.data.firstName} ${w.data.lastName}.` });
        }
      }
    });
    
    // 3. Reproduction
    const marriedWomen = livingNodes.filter(n => n.data.gender === 'female' && edges.some(e => e.data?.relationType === 'married' && e.target === n.id));
    
    marriedWomen.forEach(w => {
      const age = getAge(w, year);
      let fChance = 0;
      if (age >= 16 && age < 45) {
        fChance = 0.25 * fertilityModifier;
        if (age > 30) fChance *= 0.6;
        if (age > 40) fChance *= 0.2;
      }
      
      const marriageEdge = edges.find(e => e.data?.relationType === 'married' && e.target === w.id);
      const husband = marriageEdge ? nodes.find(n => n.id === marriageEdge.source) : null;
      
      if (!w.data.isMainBranch && (!husband || !husband.data.isMainBranch)) {
        fChance *= 0.1; // 90% fertility reduction for cadet branches
      }

      if (Math.random() < fChance) {
        // Find husband (source of marriage edge)
        if (marriageEdge) {
          const mId = marriageEdge.source;
          const gender = Math.random() > 0.5 ? 'male' : 'female';
          
          const husband = nodes.find(n => n.id === mId);
                    const child = {
              id: generateId(),
              type: 'person',
              data: {
                firstName: getRandomName(gender),
                lastName: husband ? husband.data.lastName : w.data.lastName,
                gender: gender,
                birthYear: year,
                deathYear: null,
                isMainBranch: w.data.isMainBranch || (husband && husband.data.isMainBranch)
              },
              position: { x: 0, y: 0 }
            };
          
          nodes.push(child);
          livingNodes.push(child);
          
          edges.push({
            id: `e-${mId}-${child.id}`,
            source: mId,
            sourceHandle: 'bottom',
            target: child.id,
            targetHandle: 'top',
            type: 'smoothstep',
            data: { relationType: 'biological' }
          });
          edges.push({
            id: `e-${w.id}-${child.id}`,
            source: w.id,
            sourceHandle: 'bottom',
            target: child.id,
            targetHandle: 'top',
            type: 'smoothstep',
            data: { relationType: 'biological' }
          });
          events.push({ year, text: `${child.data.firstName} ${child.data.lastName} was born to ${husband ? husband.data.firstName : 'unknown'} and ${w.data.firstName}.` });
        }
      }
    });

    if (year % 10 === 0) {
      self.postMessage({ type: 'PROGRESS_UPDATE', year });
    }
  }

  self.postMessage({ type: 'SIMULATION_COMPLETE', payload: { events, nodes, edges } });
};
