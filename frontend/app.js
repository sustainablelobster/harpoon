const API_ENDPOINT = "API ENDPOINT HERE";
const FORM_ID = "harpoon-form";
const IMAGE_INPUT_ID = "image";
const IMAGES_ROOT = "/images";
const OUTPUT_ID = "output";
const PLATFORM_ID = "platform";

function disableForm(isDisabled) {
    const form = document.getElementById(FORM_ID);
    for (let i = 0; i < form.elements.length; i++) {
        form.elements[i].disabled = isDisabled;
    }
}

function setOutput(message) {
    const output = document.getElementById(OUTPUT_ID);
    output.innerHTML = message;
}

function sanitize(s) {
    return s.replace(/[^A-Za-z0-9_.-]/g, "_");
}

async function requestTarballHead(tarballPath) {
    return await fetch(tarballPath, { method: "HEAD" });
}

async function requestImage(image, platform) {
    return await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            image: image,
            platform: platform
        })
    });
}

async function formEventListener(event) {
    event.preventDefault();
    disableForm(true);
    setOutput("Working...");

    const image = document.getElementById(IMAGE_INPUT_ID).value;
    const platform = document.getElementById(PLATFORM_ID).value;

    let tarballPath = `${IMAGES_ROOT}/${sanitize(image)}`;
    if (platform != "") {
        tarballPath += `_${sanitize(platform)}`;
    }
    tarballPath += ".tar.gz";

    let response = await requestTarballHead(tarballPath);
    if (!response.ok) {
        response = await requestImage(image, platform);
    }

    if (response.ok) {
        setOutput(`<a href="${tarballPath}">Download</a>`);
    } else {
        setOutput(`ERROR: ${await response.text()}`);
    }

    disableForm(false);
}

document.getElementById("harpoon-form").addEventListener("submit", formEventListener);
