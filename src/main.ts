import "./style.css";

const APP_NAME = "D3: Geocoin Carrier";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = APP_NAME;

const alertButton = document.createElement("button");
alertButton.innerHTML = "Click me!";
app.append(alertButton);

alertButton.addEventListener("click", () => {
  alert("you make a big click!");
});
