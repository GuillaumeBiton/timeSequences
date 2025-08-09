if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "NEW_VERSION_AVAILABLE") {
      const updateBar = document.createElement("div");
      updateBar.innerHTML = `
        <div style="background:#222;color:#fff;padding:10px;position:fixed;bottom:0;width:100%;text-align:center;">
          Nouvelle version disponible <button id="reloadBtn">Recharger</button>
        </div>
      `;
      document.body.appendChild(updateBar);
      document.getElementById("reloadBtn").addEventListener("click", () => {
        window.location.reload(true);
      });
    }
  });
}
