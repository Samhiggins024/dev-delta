console.log("loading script file?");

document
  .querySelector("#btnCreateProfile")
  .addEventListener("click", createUserProfile);

function createUserProfile(e) {
  e.preventDefault();
  // document.querySelector('#profileForm');

  //todo: defensive programming...check if nothing is there... 
  //if(!nameInput)...
  const nameInput = document.querySelector("#nameInput").value;
  const favoriteInput = document.querySelector("#favoriteInput").value;
  const commentInput = document.querySelector("#commentInput").value;

    const dogPicValue = fetch("https://dog.ceo/api/breeds/image/random ");
    console.log('dogPicValue ', dogPicValue);

    //dogPicValue.message 


  const userData = {
    name: nameInput,
    favorite: favoriteInput,
    comment: commentInput,
    dogpic: dogPicValue 
  };

  console.log('userData object ', userData);
}

async function loadOptions() {
  const response = await fetch("assets/data/data.json");

  if (!response.ok) {
    throw new Error("Could not load local JSON");
  }

  const data = await response.json();

  console.log("json data: ", data);

  const favorite = document.querySelector("#favoriteInput");
  let newOption;

  data.forEach((choice) => {
    newOption = new Option(choice.name, choice.id);
    favorite.appendChild(newOption);
  });
}
loadOptions();
