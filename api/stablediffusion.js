async function sendToStableDiffusion(promptsArray, negativePrompt) {
  for (let i = 0; i < promptsArray.length; i++) {
    let promptText = promptsArray[i].trim();
    
    // Skip if empty after the delimiter
    let parts = promptText.split(" ||| ");
    if (parts.length < 2 || parts[1].trim() === "") {
      document.getElementById("debugOutput").innerText +=
        "Skipping empty prompt for: " + promptText + "\n\n";
      continue;
    }

    // Trim if too long
    if (promptText.length > 2000) {
      promptText = promptText.substring(0, 2000);
    }

    // Build the JSON payload
    const payload = {
      prompts: [promptText],
      negative_prompt: negativePrompt,
      cfg_scale: 9,
      clip_guidance_preset: "FAST_BLUE",
      samples: 1,
      steps: 30
    };
    
    document.getElementById("debugOutput").innerText +=
      "Stability Payload for prompt " + (i+1) + ":\n" + JSON.stringify(payload, null, 2) + "\n\n";
    
    try {
      let response = await fetch("https://visual-quran.vercel.app/api/stablediffusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      let data = await response.json();
      
      // If success = false, log the error
      if (!data.success) {
        document.getElementById("debugOutput").innerText +=
          "Stability Error for prompt " + (i+1) + ":\n" + data.error + "\n\n";
      }
      // data.artifacts is an array *of arrays*
      else if (data.artifacts && Array.isArray(data.artifacts)) {
        // Flatten the array-of-arrays
        data.artifacts.forEach((artifactArray, idxA) => {
          // artifactArray is like [ { base64: "...", seed: 123, ... } ]
          if (Array.isArray(artifactArray)) {
            artifactArray.forEach((artifact, idxB) => {
              // Convert base64 to an image
              const imgUrl = `data:image/png;base64,${artifact.base64}`;
              window.generatedImages.push(imgUrl);
              
              // Append the image to the gallery
              const imageOutput = document.getElementById("imageOutput");
              const img = document.createElement("img");
              img.src = imgUrl;
              imageOutput.appendChild(img);
              
              // Save metadata in debug
              document.getElementById("debugOutput").innerText +=
                `Artifact metadata (prompt ${i+1}, array ${idxA+1}, artifact ${idxB+1}):\n` +
                JSON.stringify(artifact, null, 2) + "\n\n";
            });
          } else {
            // If by some chance artifactArray is not an array
            document.getElementById("debugOutput").innerText +=
              "Unexpected artifact format:\n" + JSON.stringify(artifactArray, null, 2) + "\n\n";
          }
        });
      }
      else {
        // Unexpected shape
        document.getElementById("debugOutput").innerText +=
          "Unexpected Stability API response: " + JSON.stringify(data) + "\n\n";
      }
    } catch (err) {
      document.getElementById("debugOutput").innerText +=
        "Error in Stability call for prompt " + (i+1) + ":\n" + err.toString() + "\n\n";
    }
  }
}
