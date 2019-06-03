// Author - Corey Buchanan

const fs = require('fs');
const basePerson = "Ronald Wilson Reagan";
const file = 'pres.ged';
const generations = 6;

let treeMembers = [];
let error;

fs.readFile(file, (err, data) => {
  if (err) {
    return console.error(err);
  }

  // Step 1
  let formattedContents = formatContents(data);
//  console.log(formattedContents);

  // Step 2
  let recordListing = convertToRecords(formattedContents);
//  console.log(recordListing);

  // Step 3
  let tree = buildTree(recordListing);

  if (error) {
    console.log(error);
  } else {
//    console.log(tree);

    // Step 4

    let fileContents = buildFileFromTree(tree);

    fs.writeFile('tree.txt', fileContents, (err) => {
      if (err) throw err;

      console.log("File saved.")

    });

  }

});

// Step 1 - Format Contents
function formatContents(data) {

  // Extract and separate by record
  let rawContents = data.toString().slice(2, data.length).split(/\r?\n0 /);
  let formattedContents = [];

  rawContents.forEach(record => {
    // Separate by line
    record = record.split(/\r?\n/);

    // Check lines for tags and throw away what isn't needed
    let reducedRecord = record.filter(value => {
      let queries = ['INDI', 'FAM','NAME', 'BIRT', 'DATE', 'PLAC', 'FAMS', 'FAMC', 'HUSB', 'WIFE', 'CHIL'];
      return queries.some(element => {
        return value.includes(element);
      });
    });

    formattedContents.push(reducedRecord);
  });

  return(formattedContents);

}


// Step 2 - Convert Contents into array of object literals

function convertToRecords(contents) {

  let records = [];
  contents.forEach(record => {
    let Record = {};
    Record.id = parseId(record);

    let name = parseGeneral(record, 'NAME');
    if (name) name = formatName(name);
    Record.name = name;

    Record.birth = parseBirth(record, 'DATE');
    Record.place = parseBirth(record, 'PLAC');
    Record.bornTo = parseGeneral(record, 'FAMC');
    Record.headOf = parseGeneral(record, 'FAMS');

    Record.husband = parseGeneral(record, 'HUSB');
    Record.wife = parseGeneral(record, 'WIFE');

    records.push(Record);
  })

  return records;

}

function parseId(record) {
  let id;
  record.forEach(line => {
    if (line.startsWith('@')) {
      // This line has id, now parse
      slicePoint = line.indexOf('@', 1);
      id = line.slice(0, slicePoint + 1);
    }
  });
  return id;
}

function parseGeneral(record, query) {
  // NAME, FAMC, FAMF, HUSB, WIFE
  let value;
  let valueFound = false;

  record.forEach(line => {
    if (line.startsWith(`1 ${query}`) && valueFound == false) {
      value = line.slice(7).trim();
      valueFound = true;
    }
  });

  return value;
}

function parseBirth(record, query) {
  // BIRT, DATE or PLAC
  let value;
  let foundBIRT = false;
  let loggedBIRT = false;

  record.forEach(line =>{
    if (line.startsWith("1 BIRT")) {
      foundBIRT = true;
    }
    if (line.startsWith(`2 ${query}`) && foundBIRT && !loggedBIRT) {
      value = line.slice(7).trim();
      loggedBIRT = true;
    }
  });

  return value;
}

// TODO - Add children to records
function parseChildren() {

}

// Makes name look nice
function formatName(name) {

  name = name.replace(/\//g, '');
  name = name.toLowerCase();

  let separatedName = name.split(' ');
  let newName = [];

  separatedName.forEach(word => {
    if (word != '') {

      if (word.charAt(0) == '(') {
        newName.push(word.charAt(0) + word.charAt(1).toUpperCase() + word.slice(2));
      } else {
        newName.push(word.charAt(0).toUpperCase() + word.slice(1));
      }

    }
  });
  name = newName.join(' ');
  return name;

}


// Step 3 Build tree
function buildTree(records) {
  let familyTree = [];
  let currentGeneration = 0;

  while (currentGeneration < generations) {
    let generationIndex = 0;
    let spotsInGeneration = 2 ** (currentGeneration + 1);
    let currentPerson;

    while (generationIndex < spotsInGeneration) {
      let treeIndex = 2 ** (currentGeneration + 1) + generationIndex - 2;
      let generationOffset = Math.floor(treeIndex / 2) - 1;

      if (generationIndex == 0 && currentGeneration == 0) {
        currentPerson = findStartingPerson(records, basePerson);
      } else if (generationIndex == 1 && currentGeneration == 0) {
        currentPerson = findSpouse(records, currentPerson);
      } else if (generationIndex % 2 == 0) {
        currentPerson = findParent(records, familyTree[generationOffset], 'father');
      } else {
        currentPerson = findParent(records, familyTree[generationOffset], 'mother');
      }

      familyTree[treeIndex] = currentPerson;
      generationIndex++;
    }

    currentGeneration++;

  }

  // TODO - ADD CHILDREN

  return familyTree;

}

// Find person for base of tree
function findStartingPerson (contents, name) {

  let record = contents.find(r => {
    return r.name == name;
  });

  return record;

}

// Needs a little cleanup, replace starting person for example, possibly better to pass ids
function findSpouse(contents, person) {

  if (!person) {
    error = "Error, couldn't find starting person."
    return;
  }

  let familyRecord = findRecordById(contents, person.headOf);

  if (familyRecord.husband == person.id) {
    return findRecordById(contents, familyRecord.wife);
  } else {
    return findRecordById(contents, familyRecord.husband);
  }

}

function findParent(contents, person, whichParent) {

  if(!person) {
    error = "Error, couldn't find starting person.";
    return;
  }

  let familyRecord = findRecordById(contents, person.bornTo);

  if (whichParent == 'father') {
    return findRecordById(contents, familyRecord.husband);
  } else {
    return findRecordById(contents, familyRecord.wife);
  }

}

function findRecordById(contents, id) {

  let record = contents.find(r => {
    return r.id == id;
  });

  return record;

}

// TODO - Finish this
function findChildren(contents, person) {

  let children = [];

  let familyRecord = findRecordById(contents, person.headOf);


}


// Step 4 Build file from tree

function buildFileFromTree(tree) {

  let contents = "";

  tree.forEach((person, index) => {

    contents += (index + 1) + ' ';
    contents += person.name + '\n';
    contents += person.birth + '\n';
    contents += person.place + '\n\n';

  });

  contents = contents.replace(/undefined/g, '_blank_');

  return contents;

}






//
