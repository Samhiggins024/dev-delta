
const profileForm = document.querySelector("#profile-form");
const profileOutput = document.querySelector("#profile-output");
const favoriteSelect = document.querySelector("#favoriteInput");

async function loadOptions() {
  const response = await fetch("assets/data/data.json");

  if (!response.ok) {
    throw new Error("Could not load favorite options");
  }
  
  
  const choices = await response.json();
  console.log('local json choices: ', choices);

  choices.forEach((choice) => {
    const option = new Option(`${choice.emoji} ${choice.name}`, choice.id);
    favoriteSelect.appendChild(option);
  });

  const savedProfile = sessionStorage.getItem("userData");
  if (savedProfile) {
    showProfile(JSON.parse(savedProfile));
  }
}
function showProfile(userData) {
  console.log('user dat from show profile fn: ', userData); 
  profileOutput.textContent =
    `${userData.name} likes ${userData.favorite}. ${userData.comment}`;
}

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const userData = {
    name: document.querySelector("#nameInput").value,
    comment: document.querySelector("#commentInput").value,
    favorite: favoriteSelect.options[favoriteSelect.selectedIndex].text
    
  };

  console.log(userData);
  
  const json = JSON.stringify(userData);
  sessionStorage.setItem("userData", json);
 
  const savedProfile = JSON.parse(sessionStorage.getItem("userData"));
 
  showProfile(savedProfile);

 

  
});
async function loadDogImage() {
  const response = await fetch("https://dog.ceo/api/breeds/image/random");

  if (!response.ok) {
    throw new Error("Could not load a dog photo");
  }
  const data = await response.json();
  
  document.querySelector("#dog-image").src = data.message;
  console.log(data);
}

loadOptions().catch((error) => console.error(error));
loadDogImage().catch((error) => console.error(error));
