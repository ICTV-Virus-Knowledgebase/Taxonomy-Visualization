
// Create the ICTV namespace if it doesn't already exist.
if (!window.ICTV) { window.ICTV = {}; }

// Make sure the tippy library is available.
if (!window.tippy) {
   if (!!tippy) {
      window.tippy = tippy;
   } else {
      // Since tippy.js isn't available, add a dummy delegate function so tooltips will fail gracefully.
      console.error("Unable to find the tippy.js library");
      window.tippy = {
         delegate: function (dummyOne, dummyTwo) { }
      };
   }
}


window.ICTV.d3TaxonomyVisualization = function (
   containerSelector_,
   currentReleaseNumber_,
   dataURL_,
   releases_,
   taxonDetailsURL_,
   taxonomyURL_
) {

   // Validate input parameters
   if (!containerSelector_) { throw new Error("Invalid container selector"); }
   const containerSelector = containerSelector_;

   if (!currentReleaseNumber_) { throw new Error("Invalid current release number"); }
   const currentReleaseNumber = currentReleaseNumber_;

   if (!dataURL_) { throw new Error("Invalid data URL"); }
   const dataURL = dataURL_;

   if (!releases_) { throw new Error("Invalid MSL releases parameter"); }
   const releases = releases_;

   if (!taxonDetailsURL_) { throw new Error("Invalid taxon details URL"); }
   const taxonDetailsURL = taxonDetailsURL_;

   if (!taxonomyURL_) { throw new Error("Invalid taxonomy web service URL"); }
   const taxonomyURL = taxonomyURL_;

   
   // Configuration settings (to replace hard-coded values below)
   const settings = {
      animationDuration: 900,
      node: {
         radius: 17.5,
         strokeWidth: 3,
         textDx: 25,
         textDy: 25,
      },
      svg: {
         height: jQuery(window).height() * 0.8,
         margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
         },
         width: jQuery(window).width(),
      },
      tooltip: {
         animation: "scale",
         hideDelay: 0,
         interactiveBorder: 5,
         showDelay: 300
      },
      xFactor: 0.5, // TODO: this is influencing Y offset, not X
      yFactor: 300,
      yOffset: 0,
      zoom: {
         scaleFactor: 0.19, //.17,
         translateX: -(jQuery(window).width() * 2.5), //-3850,
         translateY: -(jQuery(window).height() * 0.45), //-1800
      },
   };
   let notResultNode_ = null;
   var selectedNode;
   var clickedText;
   var clickedCircle;
   var selected;
   var num_flag = false;
   var num;
   var name = "";
   var arr = [];
   var temp = 0;
   var Flag = true;
   var max = 0;
   var fs = 0;
   var Sflag = false
   var counter = 0;
   var len = 0;
   var res = [];
   // var zoom = d3.zoom().on("zoom", handleZoom);
   // function handleZoom(e) {
   //     d3.select(`${containerSelector} svg g`).attr("transform", e.transform);
   // }

   // Get and validate the species panel's parent name Element.
   const speciesParentEl = document.querySelector(`${containerSelector} .species-panel .parent-name`);
   if (!speciesParentEl) { throw new Error("Invalid parent name element"); }

   // Get and validate the species panel's species list Element.
   const speciesListEl = document.querySelector(`${containerSelector} .species-panel .species-list`);
   if (!speciesListEl) { throw new Error("Invalid species list element"); }

   // The DOM Element for the font size panel and slider (these are assigned in "iniitializeFontSizePanel").
   let fontSizePanelEl = null;
   let fontSliderEl = null;

   // DOM element for Zoom slider (assigned in "initialzeZoomPanel")
   let ZoomPanelEl = null;
   let ZoomSliderEl = null;

   //DOM element for ss button
   let buttonE1 = null;
   let buttonClickE1 = null

   // The DOM Element for the release control (this is assigned in "initializeReleaseControl").
   let releaseControlEl = null;

   // This will be populated with a release's species data.
   let speciesData = null;

   // Create an instance of the search panel object and initialize it.
   const searchPanel = new window.ICTV.SearchPanel(currentReleaseNumber, selectSearchResult, `${containerSelector} .search-results-panel`,
   `${containerSelector} .search-panel`, taxonDetailsURL, taxonomyURL);

   searchPanel.initialize();


   // Initialize the font size slider and its label.
   initializeFontSizePanel();

   // Initialize the Zoom slider and its label.
   initializeZoomPanel();

   //Initialize ss 
   initializeButton();

   // Initialize the release control using MSL release data.
   initializeReleaseControl();

   
   // Clear the contents of the species panel.
   function clearSpeciesPanel() {
      speciesParentEl.innerHTML = "";
      speciesListEl.innerHTML = "";
   }

   // Populate the species panel.
   // Note: The parameters should've been validated before this function is called.
   function displaySpecies(parentName, parentRank, parentTaxNodeID) {

      // Populate the parent name panel.
      speciesParentEl.innerHTML = `Species of <span class="parent-rank">${parentRank}</span><br/><em>${parentName}<\em>`;

      // Convert the taxnode ID to a string so it can be used as a key in the species data.
      const strTaxNodeID = new String(parentTaxNodeID);

      // Get all species associated with the parent.
      const speciesArray = speciesData[strTaxNodeID];
      if (!speciesArray || speciesArray.length < 1) {

         // Display a message in the species list.
         speciesListEl.innerHTML = "No species available";
         return;
      }

      // Initialize the species list panel.
      speciesListEl.innerHTML = "";

      // Iterate over every species
      speciesArray.forEach(function (species) {

         // Create and populate a species Element.
         const speciesEl = document.createElement("div");
         speciesEl.className = "species-row";
         speciesEl.innerHTML = species.name;
         speciesEl.setAttribute("data-taxnode-id", species.taxNodeID);

         speciesEl.addEventListener("click", function (e) {
            
            const taxNodeID = e.target.getAttribute("data-taxnode-id");

            window.open(`${taxonDetailsURL}?taxnode_id=${taxNodeID}`, "_blank");
         });

         // Add the species Element to the list.
         speciesListEl.appendChild(speciesEl);
      });
   }

   // TODO: What button? Give this a better name!
   function initializeButton() {

      // Get a reference to the panel Element.
      let buttonE1 = document.querySelector(`${containerSelector} .font-size-panel`);
      if (!buttonE1) { throw new Error("Invalid font size panel Element"); }

      // Create a button.
      let buttonClickE1 = d3
         .select(`${containerSelector} .font-size-panel`)
         .append("button")
         .attr("class", "screenshot-button")
         .html(`<i class="fa fa-camera"></i> Screenshot`);

      // Create a dropdown for format selection.
      let selectFormat = d3.select(`${containerSelector} .font-size-panel`)
         .append("select")
         .attr("class", "selectFormat");

      // Add options to the dropdown.
      selectFormat.selectAll("option")
         // lrm 6-7-2024
         // changed "pdf" to svg
         .data(["png", "svg", "pdf"]) // SVG supported now
         .enter()
         .append("option")
         .attr("value", function (d) { return d; })
         .text(function (d) { return d.toUpperCase(); });

      // Click on button to get screenshot.
      buttonClickE1.on("click", function (e) {

         const selectedFormat = selectFormat.node().value;

         if (selectedFormat === "png") {

            // Select the SVG element from the document
            let svg = document.querySelector('svg');

            // Get the D3 selection of the SVG
            let svgSelection = d3.select(svg);

            // Apply inline CSS to match SVG before
            svgSelection.selectAll('text.legend-node-text')
               .style('font-size', '64px')
               .style('font-style', 'normal')
               .style('text-transform', 'capitalize')
               .style('fill', 'black')
               .attr('transform', function (d, i) {
                  return 'rotate(-45, 50, 50)';
               })

            svgSelection.selectAll('text.node-text')
               .style('font-size', '64px')
               .style('font-style', 'italic')
               .style('font-weight', 'bold')

            svgSelection.selectAll('text.unassigned-text')
               .style('font-size', '64px')
               .style('font-style', 'normal')
               .style('text-transform', 'capitalize')
               .style('fill', 'black')

            // Save the original viewBox attribute value of the SVG
            let originalViewBox = svg.getAttribute('viewBox');

            // Get the bounding box of the SVG content
            let bbox = svg.getBBox();

            // Set the viewBox attribute to the bounding box dimensions to fit the SVG contents
            svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

            // Get the size of the SVG element in pixels
            let svgSize = svg.getBoundingClientRect();

            // Function to process the SVG and convert it to an image
            let processPanel = () => {
               return new Promise((resolve, reject) => {

                  // Serialize the SVG element to a string
                  let serializer = new XMLSerializer();
                  let svgStr = serializer.serializeToString(svg);

                  // Create a scale factor
                  let scaleFactor = 4;

                  // Create a canvas element to draw the SVG onto
                  let canvas = document.createElement("canvas");
                  canvas.width = svgSize.width * scaleFactor;
                  canvas.height = svgSize.height * scaleFactor;

                  // Get the 2D rendering context of the canvas
                  let ctx = canvas.getContext("2d");

                  // Scale the context before drawing the SVG onto it
                  ctx.scale(scaleFactor, scaleFactor);

                  let img = document.createElement("img"); // Create an image element
                  img.onload = () => {
                     ctx.fillStyle = "white";
                     ctx.fillRect(0, 0, canvas.width, canvas.height);

                     // Draw the image (SVG content) onto the canvas
                     ctx.drawImage(img, 0, 0);

                     // Convert the canvas content to a data URL (image/png or image/jpeg)
                     let imgData = canvas.toDataURL(`image/${selectedFormat}`);

                     // Reset or remove the viewBox attribute to its original value
                     if (originalViewBox) {
                        svg.setAttribute('viewBox', originalViewBox);
                     } else {
                        svg.removeAttribute('viewBox');
                     }

                     // Resolve the promise with the image data
                     resolve(imgData);
                  };
                  // Set the image source to the serialized SVG data (base64 encoded)
                  img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr))));
               });
            };

            // Process the SVG and then save the image
            processPanel().then((imgData) => {
               // Create a link element to download the image
               let link = document.createElement('a');
               link.download = `screenshot.${selectedFormat}`; // Use the selected format in the filename
               link.href = imgData;
               link.click(); // Trigger the download
            });
         }

         // lrm 5-29-2024
         // SVG selection
         else if (selectedFormat === "svg") {

            // Select the SVG element
            let svg = document.querySelector('svg');

            // Store the original viewBox value
            let originalViewBox = svg.getAttribute('viewBox');

            // Get the bounding box of the SVG content
            let bbox = svg.getBBox();

            // Set the viewBox attribute to the bounding box dimensions to fit the SVG contents
            svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

            // Create a D3 selection from the SVG
            let svgSelection = d3.select(svg);

            // Apply inline styles to the SVG elements
            svgSelection.selectAll('text.legend-node-text')
               // 64px = 4rem
               // adobe illustrator did not like rem
               .style('font-size', '64px')
               .style('font-style', 'normal')
               .style('fill', 'black')
               // adobe illustrator does not read text-transform
               // instead, use JS to capitalize the first letter for rank columns
               .text(function (d) {
                  if (d.data.rankName === "species") {
                     return;
                  } else {
                  return d.data.rankName.charAt(0).toUpperCase() + d.data.rankName.slice(1);
                  }
               })
               // adobe illustrator likes this for text rotation
               .attr('transform', function (d, i) {
                  return 'rotate(-45, 50, 50)';
               });

            svgSelection.selectAll('text.node-text')
               .style('font-size', '64px')
               .style('font-style', 'italic')
               .style('font-weight', 'bold')

            svgSelection.selectAll('text.unassigned-text')
               .style('font-size', '64px')
               .style('font-style', 'normal')
               .style('fill', 'black')

            // Serialize the SVG to a string
            let serializer = new XMLSerializer();
            let svgStr = serializer.serializeToString(svg);

            // Create a Blob object from the SVG string
            let blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });

            // Create a URL for the Blob object
            let url = URL.createObjectURL(blob);

            // Create a link element and set its href to the Blob URL
            let link = document.createElement('a');
            link.href = url;

            // Set the download attribute of the link to specify the file name
            link.download = 'image.svg';

            // Append the link to the document
            document.body.appendChild(link);

            // Simulate a click on the link
            link.click();

            // Remove the link from the document
            document.body.removeChild(link);

            // Reset or remove the viewBox attribute to its original value
            if (originalViewBox) {
               svg.setAttribute('viewBox', originalViewBox);
            } else {
               svg.removeAttribute('viewBox');
            }

         }

         // lrm 6-20-2024
         // PDF selection
         // This export is done via server-side with InkScape's CLI
         else if (selectedFormat === "pdf") {

            // Select the SVG element
            let svg = document.querySelector('svg');

            // Store the original viewBox value
            let originalViewBox = svg.getAttribute('viewBox');

            // Get the bounding box of the SVG content
            let bbox = svg.getBBox();

            // Set the viewBox attribute to the bounding box dimensions to fit the SVG contents
            svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

            // Create a D3 selection from the SVG
            let svgSelection = d3.select(svg);

            // Apply inline styles to the SVG elements
            svgSelection.selectAll('text.legend-node-text')
               // 64px = 4rem
               // adobe illustrator did not like rem
               .style('font-size', '64px')
               .style('font-style', 'normal')
               .style('fill', 'black')
               // adobe illustrator does not read text-transform
               // instead, use JS to capitalize the first letter for rank columns
               .text(function (d) {
                  if (d.data.rankName === "species") {
                     return;
                  } else {
                     return d.data.rankName.charAt(0).toUpperCase() + d.data.rankName.slice(1);
                  }
               })
               // adobe illustrator likes this for text rotation
               .attr('transform', function (d, i) {
                  return 'rotate(-45, 50, 50)';
               });

            svgSelection.selectAll('text.node-text')
               .style('font-size', '64px')
               .style('font-style', 'italic')
               .style('font-weight', 'bold')

            svgSelection.selectAll('text.unassigned-text')
               .style('font-size', '64px')
               .style('font-style', 'normal')
               .style('fill', 'black')

            // Serialize the SVG to a string
            let serializer = new XMLSerializer();
            let svgStr = serializer.serializeToString(svg);

            // Send a POST request to the server with the SVG data
            fetch('/ictv_d3_taxonomy_visualization/pdf_export', {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
               },
               body: `svg=${encodeURIComponent(svgStr)}`,
            })
               .then(response => response.blob())
               .then(blob => {

                  // Create a URL for the Blob object
                  let url = URL.createObjectURL(blob);

                  // Create a link element and set its href to the Blob URL
                  let link = document.createElement('a');
                  link.href = url;

                  // Set the download attribute of the link to specify the file name
                  link.download = 'image.pdf';

                  // Append the link to the document
                  document.body.appendChild(link);

                  // Simulate a click on the link
                  link.click();

                  // Remove the link from the document
                  document.body.removeChild(link);

                  // Reset or remove the viewBox attribute to its original value
                  if (originalViewBox) {
                     svg.setAttribute('viewBox', originalViewBox);
                  } else {
                     svg.removeAttribute('viewBox');
                  }
               });
         }

      });
   }

   let zoom = d3.zoom()
      .on("zoom", function (event) {
         d3.select(`${containerSelector} .taxonomy-panel svg g`)
            .attr("transform", event.transform);
      });

   var svg_zoom = d3
      .select(`${containerSelector} .taxonomy-panel svg`)
      .call(
         zoom.translateBy,
         settings.zoom.translateX,
         settings.zoom.translateY
      )
      .call(zoom.scaleBy, settings.zoom.scaleFactor)
      .call(zoom)
      .on("dblclick.zoom", null);


   // Use the release year to lookup and return the corresponding release data.
   function getRelease(releaseYear) {

      if (!releaseYear) { throw new Error("Invalid release year in getRelease (empty)"); }

      // when running in local environment, use the r
      const release = releases.data[`r${releaseYear}`];

      // when uploading to drupal, use only the year
      // const release = releases.data[`${releaseYear}`];
      if (!release) { throw new Error(`No release found for release year ${releaseYear}`); }

      return release;
   }

   function initializeZoomPanel() {
      ZoomPanelEl = document.querySelector(`${containerSelector} .font-size-panel`);
      if (!ZoomPanelEl) { throw new Error("Invalid font size panel Element"); }

      if (ZoomPanelEl.classList.contains("show")) { ZoomPanelEl.classList.remove("show"); }

      d3
         .select(".font-size-panel")
         .append("div")
         .attr("class", "label")
         .text("Zoom");

      ZoomSliderEl = d3
         .select(".font-size-panel")
         .append("input")
         .attr("class", "slider")
         .attr("type", "range")
         .attr("min", 0.19)
         .attr("max", 1)
         .attr("step", 0.01)
         .attr("value", 0.19);

      ZoomSliderEl.on("input", function (e) {
         const zoomValue = e.target.value;
         const svg = d3.select(`${containerSelector} .taxonomy-panel svg`);

         let currentTransform = d3.zoomTransform(svg.node());
         svg.call(zoom.transform, d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(zoomValue));
      });
   }

   // Initialize the font size slider and its label.
   function initializeFontSizePanel() {

      // Get a reference to the font size panel Element.
      fontSizePanelEl = document.querySelector(`${containerSelector} .font-size-panel`);
      if (!fontSizePanelEl) { throw new Error("Invalid font size panel Element"); }

      // Make sure the font size panel is hidden.
      if (fontSizePanelEl.classList.contains("show")) { fontSizePanelEl.classList.remove("show"); }
      fontSizePanelEl.classList.add("hide");

      // Create the font size label.
      d3
         .select(".font-size-panel")
         .append("div")
         .attr("class", "label")
         .text("Font size");

      // Create the slider control and a reference to it.
      fontSliderEl = d3
         .select(".font-size-panel")
         .append("input")
         .attr("class", "slider")
         .attr("type", "range")
         .attr("min", 4)
         .attr("max", 8)
         .attr("value", 4);

      // changing the font on change of slider
      fontSliderEl.on("input", function (e) {
         const fontSize = e.target.value;
         font = fontSize + "rem";

         // Constrain the font size change to the taxonomy panel.
         const treeTextSelector = `${containerSelector} .taxonomy-panel text`;
         d3.selectAll(treeTextSelector).style("font-size", font);
         // getBBox(ds);
      });
   }

   // Initialize the release control with MSL releases.
   function initializeReleaseControl() {

      if (!releases) { throw new Error("Invalid MSL releases in initializeReleaseControl"); }

      // Get the release control DOM Element.
      releaseControlEl = document.querySelector(`${containerSelector} .header-panel .release-ctrl`);
      if (!releaseControlEl) { throw new Error("Invalid release control"); }

      // Clear any existing options
      releaseControlEl.innerHTML = null;

      // Add an option for each release year.
      releases.displayOrder.forEach((releaseKey_) => {

         // Get the release corresponding to this release key. Note that a release 
         // key is the release year prefaced by "r".
         const release = releases.data[releaseKey_];
         if (!release) { return; }

         // Create an option Element and set its display text and value.
         const option = document.createElement("option");
         option.text = `${release.year} (MSL ${release.releaseNum})`;
         option.value = release.year;

         releaseControlEl.appendChild(option);
      })

      // Add a "change" event handler
      releaseControlEl.addEventListener("change", async (e_) => {

         const releaseYear = e_.target.value;
         if (!releaseYear) { throw new Error("Invalid release control value"); }

         // Get the release data for this year.
         const release = getRelease(releaseYear);
         if (!release) { throw new Error(`No release data available for release year ${releaseYear}`) }

         // Update the search panel's selected release.
         searchPanel.releaseNumber.selected = release.releaseNum;

         // Clear the species panel
         clearSpeciesPanel();

         // Display the taxonomy of the selected release.
         await displayReleaseTaxonomy(releaseYear);

         // Make sure the font size panel is visible.
         if (!!fontSizePanelEl && fontSizePanelEl.classList.contains("hide")) {
            fontSizePanelEl.classList.remove("hide");
            fontSizePanelEl.classList.add("show");
         }

         return;
      });

      // Select the most recent release.
      releaseControlEl.options.selectedIndex = 0;
      releaseControlEl.dispatchEvent(new Event("change"));
   }

   // Display the taxonomy tree for the release selected by the user.
   async function displayReleaseTaxonomy(releaseYear_) {

      if (!releaseYear_) { throw new Error("Invalid release year in displayReleaseTaxonomy"); }

      // Get the release data for this year.
      const release = getRelease(releaseYear_);
      if (!release) { throw new Error(`No data available for release year ${releaseYear_}`); }

      const rankCount = release.rankCount;

      // TODO: Figure out the purpose of these variables and give them better names!
      num = 0;
      temp = 0;
      arr = [];
      Flag = false;
      Sflag = false;
      num_flag = false;
      max = 0;
      len = 0;
      counter = 0;
      res = [];

      // If there's already an SVG element in the taxonomy panel, delete it.
      const existingSVG = document.querySelector(`${containerSelector} .taxonomy-panel svg `);
      if (!!existingSVG) { existingSVG.remove(); }

      // Format the release year for use as part of a JSON filename.
      let filenameReleaseYear = releaseYear_.replace(/a$/, "").replace(/b$/, ".5");

      // Determine the filenames for the non-species and species JSON files.
      const nonSpeciesFilename = `${dataURL}/data/nonSpecies_${filenameReleaseYear}.json`;
      const speciesFilename = `${dataURL}/data/species_${filenameReleaseYear}.json`;

      // Load the species data for this release.
      speciesData = await d3.json(speciesFilename).then(function (s) { return s; });
      if (!speciesData) {
         throw new Error(`Invalid species data for release ${release_}`);
      }

      // TODO: the non-species file shouldn't be opened twice. Improve the code below!!!
      // Load the non-species data for this release.
      // d3.json(nonSpeciesFilename).then(function (data) {
         // const ab = d3.hierarchy(data, function (d) {
         //    if (d.children === null) { return; }

         //    do {
         //       let str = d.child_counts;
         //       var result;
         //       const regex = /(\d+)/;
         //       if (typeof str === "string" && str.length > 0) {
         //          if (str.includes("species")) {
         //             result = str.replace(/, .*species|,.*$/, "");
         //          } else {
         //             result = str?.match(regex);
         //          }
         //       }
         //       if (typeof result === "string" && result.length > 0) {
         //          num = parseInt(result.match(/\d+/)[0]);
         //          if (num > 500) {
         //             num = temp;
         //          } else {
         //             if (num > temp) {
         //                arr.push(temp);
         //                temp = num;
         //             }
         //          }
         //       }
         //    } while (num >= 1000);

         //    max = Math.max(...arr);
         //    num_flag = true;
         //    return d.children; 
         // });
      // });
      
      // lrm 6-20-2024
      // nonSpeciesFilename was being loaded twice, I took the commented code above
      // and put it where it was being loaded a 2nd time.
      d3.json(nonSpeciesFilename).then(function (data) {
         
         var genus = false;

         const ab = d3.hierarchy(data, function (d) {
            if (d.children === null) { return; }

            do {
               let str = d.child_counts;
               var result;
               const regex = /(\d+)/;
               if (typeof str === "string" && str.length > 0) {
                  if (str.includes("species")) {
                     result = str.replace(/, .*species|,.*$/, "");
                  } else {
                     result = str?.match(regex);
                  }
               }
               if (typeof result === "string" && result.length > 0) {
                  num = parseInt(result.match(/\d+/)[0]);
                  if (num > 500) {
                     num = temp;
                  } else {
                     if (num > temp) {
                        arr.push(temp);
                        temp = num;
                     }
                  }
               }
            } while (num >= 1000);

            max = Math.max(...arr);
            num_flag = true;
            return d.children;
         });

         // Set the width and height available within the SVG.
         const availableHeight =
            settings.svg.height -
            settings.svg.margin.left -
            settings.svg.margin.right;
         const availableWidth =
            settings.svg.width -
            settings.svg.margin.top -
            settings.svg.margin.bottom;
         var zoom = d3.zoom().on("zoom", handleZoom);

         function handleZoom(e) {
            d3.select(`${containerSelector} svg g`).attr("transform", e.transform);
         }


         let drag = d3
            .drag()
            .on("start", start)
            .on("drag", dragged)
            .on("end", dragend);

         function start(d) {
            d.fixed = true;
         }

         function dragged() {
            var x = event.x;
            var y = event.y;
            var current = d3.select(`${containerSelector} svg g`);
            current.attr("transform", `translate(${x},${y})`);
         }

         function dragend(d) {
            d.fixed = false;
         }

         // TODO: Consider renaming "ds" to "root"
         const ds = d3.hierarchy(data, function (d) {
            
            if (d.children === null) { return; }
            
            do {
               let str = d.child_counts;
               var result;
               const regex = /(\d+)/;
               if (typeof str === "string" && str.length > 0) {
                  if (str.includes("species")) {
                     result = str.replace(/, .*species|,.*$/, "");
                  } else {
                     result = str?.match(regex);
                  }
               }
               if (typeof result === "string" && result.length > 0) {
                  num = parseInt(result.match(/\d+/)[0]);
                  if (num > 500) {
                     num = temp;
                  } else {
                     if (num > temp) {
                        arr.push(temp);
                        temp = num;
                     }
                  }
               }
            } 
            while (num > 1000);
            const max = Math.max(...arr);
            num_flag = true;
            return d.children;
         });

         // Create and populate the tree structure.
         createTree(ds);


         // TODO: this needs a more informative name.
         var i = 0;

         function createTree(ds) {
            var svg = d3
               .select(`${containerSelector} .taxonomy-panel`)
               .append("svg")
               .attr("width", settings.svg.width)
               .attr("height", settings.svg.height)
               .append("g")
               .attr(
                  "transform",
                  `translate(${settings.svg.margin.left},${settings.svg.margin.top})`
               );

            let zoom = d3.zoom()
               // zoom constraints
               // .05: Zoom out to 5% of the original size
               // .5: Zoom in to .5 times the original size
               .scaleExtent([0.05, .5])
               .on("zoom", function (event) {
                  svg.attr("transform", event.transform);
               });

            var svg_zoom = d3
               .select(`${containerSelector} .taxonomy-panel svg`)
               .call(
                  zoom.translateBy,
                  settings.zoom.translateX,
                  settings.zoom.translateY
               )
               .call(zoom.scaleBy, settings.zoom.scaleFactor)
               .call(zoom)
               .on("dblclick.zoom", null);

            // Use d3 to generate the tree layout/structure.
            const treeLayout = d3.tree().size([availableHeight, availableWidth]);

            treeLayout(ds);

            // TEST
            //ds.x0 = -100;
            ////ds.x0 = (availableHeight / 4);
            //ds.y0 = -100;

            function pageNodes(d, maxNode) {

               if (d.children) {
                  d.children.forEach((c) => pageNodes(c, maxNode));
                  if (d.children.length > maxNode) {
                     d.pages = {};
                     const count = maxNode - 2;
                     const l = Math.ceil(d.children.length / count);
                     for (let i = 0; i < l; i++) {
                        let startRange = i * count;
                        let endRange = i * count + count;
                        d.pages[i] = d.children.slice(startRange, endRange);
                        d.pages[i].unshift({
                           ...d.pages[i][0],
                           data: {
                              name: "Up",
                              rankName: "Shift",
                              rankIndex: rankCount - 2,
                           },
                           page: i == 0 ? l - 1 : i - 1,
                        });
                        d.pages[i].push({
                           ...d.pages[i][0],
                           data: {
                              name: "Down",
                              rankName: "Shift",
                              rankIndex: rankCount - 2,
                           },
                           page: i != l - 1 ? i + 1 : 0,
                        });
                     }
                     d.children = d.pages[0];
                  }
               }
            }

            ds.children.forEach((c) => pageNodes(c, 90));

            ds.children.forEach(collapse);

            update(ds);


            function update(source) {

               if (!source) {
                  console.error("in update and source is invalid");
                  return;
               }

               var info = treeLayout(ds);
               var parent = info.descendants();
               var currentNodeCount = parent.length;
               const scaleFactor = Math.min(1, settings.svg.height / 90);
               const dx = 21 * scaleFactor;
               const dy = settings.svg.height / (currentNodeCount + 1);
               treeLayout.nodeSize([dx, dy]);
               var links = info.descendants().slice(1);
               // console.log(links);
               const treeNodes = treeLayout(ds);
               treeNodes.each((d) => {
                  const x = d.x; // the x-coordinate of the node in the layout
                  const y = d.y; // the y-coordinate of the node in the layout
                  // use x and y to position the node in the visualization
               });

               parent.forEach(function (d) {
                  var h = settings.svg.height / 125;
                  var w = (settings.svg.width * 5) / rankCount;

                  let str = d.data.child_counts;

                  var result;
                  const regex = /(\d+)/;
                  if (typeof str === "string" && str.length > 0) {
                     if (str.includes("species")) {
                        result = str.replace(/, .*species|,.*$/, "");
                     } else {
                        result = str?.match(regex);
                     }
                  }
                  if (typeof result === "string" && result.length > 0) {
                     num = parseInt(result.match(/\d+/)[0]);
                  }

                  d.x = d.x * h;
                  d.y = d.depth * w;
               });

               var children = svg.selectAll("g.node").data(parent, function (d) {
                  return d.id || (d.id = ++i);
               });

               var Enter = children
                  .enter()
                  .append("g")
                  .attr("class", "node")
                  // add attributes to g nodes from JSON data
                  // .attr("data-id", function (d) {
                  //    return d.data.json_id;
                  // })
                  // .attr("data-lineage", function (d) {
                  //    return d.data.json_lineage;
                  // })
                  .attr("parent-name", function (d) {
                     return d.data.name;
                  })
                  .attr("parent-rank", function (d) {
                     return d.data.rankName;
                  })
                  .attr("taxNodeId", function (d) {
                     return d.data.taxNodeID;
                  })
                  .attr("has_species", function (d) {
                     return d.data.has_species;
                  })
                  .attr("is_assigned", function (d) {
                     return d.data.is_assigned;
                  })
                  .attr("children", function (d) {
                     return d.data.children;
                  })
                  .attr("ghost-node", function (d) {
                     if (isGhostNode(d)) {
                        return "true";
                     }
                  })
                  .attr("transform", function (d) {
                     if (!d || isNaN(source.x0) || isNaN(source.y0)) {
                        return null;
                     }
                     return "translate(" + source.y0 + "," + source.x0 + ")";
                  })
                  .on("click", click);

               // lrm 5-22-2024
               // Commented out this code to instead, append a circle to the nodes
               // this is done in the update circle.node function
               // TODO: Probably take this out, leaving it here for now
               Enter.append("rect")
                  .style("stroke", "black")
                  .style("stroke-width", "3px")
                  // .attr("width", function (d) {
                  //    if (d.data.name === null) {
                  //       // console.log(d.data.name);
                  //       if (
                  //          d.data.rankName === "realm" &&
                  //          d.data.taxNodeID !== "legend"
                  //       ) {
                  //          return "20px";
                  //       } else if (
                  //          d.data.has_assigned_siblings === true ||
                  //          d.data.has_unassigned_siblings === true
                  //       ) {
                  //          return "20px";
                  //       } else {
                  //          return "0px";
                  //       }
                  //    }
                  // })
                  // .attr("height", function (d) {
                  //    if (d.data.name === "Unassigned") {
                  //       // console.log(d.data.name);
                  //       if (
                  //          d.data.rankName === "realm" &&
                  //          d.data.taxNodeID !== "legend"
                  //       ) {
                  //          return "20px";
                  //       } else if (
                  //          d.data.has_assigned_siblings === true &&
                  //          d.data.has_unassigned_siblings === true
                  //       ) {
                  //          return "20px";
                  //       } else {
                  //          return "0px";
                  //       }
                  //    }
                  // })
                  .style("fill", function (d) {

                     // if (this === clickedRect) {
                     //    console.log(clickedRect);
                     //    // console.log(clickedCircle);
                     //    return "#006CB5";
                     // } else  if(this !== clickedRect){
                     //    return "white";
                     // }

                     findParent(d);
                  })
                  .attr("cursor", "pointer");
               // lrm 5-22-2024
               // this code appears to not be needed, the logic for the circle is in the update circle.node function
               Enter.append("circle")
                  .attr("class", "node")
                  // .attr("r", function (d) {
                  //    if (d.data.name !== "Unassigned") {
                  //       return settings.node.radius;
                  //    } else if (d.data.name === "Unassigned") {
                  //       if (d.data.rankName === "realm" && d.data.taxNodeID !== "legend") {
                  //          return settings.node.radius;
                  //       } else if (d.data.has_assigned_siblings === true && d.data.has_unassigned_siblings === true) {
                  //          console.log(d.data.has_assigned_siblings);
                  //          return settings.node.radius;
                  //       } else {
                  //          return 0;
                  //       }
                  //    }
                  // })
                  .style("stroke", "black")
                  .style("stroke-width", `${settings.node.strokeWidth}px`)
                  .style("fill", function (d) {
                     
                     // lrm 5-20-2024
                     // update DOM element's appended circle when clicked
                     // if (this === clickedCircle) {
                     //    // console.log(clickedCircle);
                     //    return "#006CB5";
                     // } else  if(this !== clickedCircle) {
                     //    return "white";
                     // }
                     findParent(d);
                  })
                  
                  .style("opacity", function (d) {
                     // TODO: what is this doing?
                     return !d.data.parentDistance ? 0 : 1;
                  })
                  .style("pointer-events", function (d, i) {
                     return !d.data.parentDistance ? "none" : "all";
                  });

               function getBB(ds) {
                  ds.each(function (d) {
                     d.bbox = this.getBBox();
                  });
               }

               Enter.append("text")
                  .attr("x", function (d) {
                     return d.children ? -13 : 13;
                  })
                  .attr("class", function (d) {

                     let className = "node-text";

                     if (d.data.taxNodeID === "legend") {
                        className = "legend-node-text";
                     } else if (d.data.name === "Unassigned" && !isGhostNode(d)) {
                        className = "unassigned-text";
                     } else if(isGhostNode(d)) {
                        className = "ghost-node-text";
                     }

                     return className;
                  })
                  .attr("x", function (d, i) {
                     if (d.data.rankIndex === 0) {
                        return d.children || d._children ? 10 : -10;
                     } else if (d.data.taxNodeID !== "legend") {
                        return d.children || d._children ? 0 : 10;
                     }
                  })
                  .attr("text-anchor", function (d) {
                     if (d.data.rankIndex === 0) {
                        return d.children || d._children ? "start" : "end";
                     } else if (
                        d.data.has_species !== 0 &&
                        d.data.taxNodeID !== "legend" &&
                        d.data.rankIndex === rankCount - 1
                     ) {
                        return d.children || d._children ? "end" : "start";
                     }
                  })
                  .style("font-size", "4rem")
                  .attr("dx", settings.node.textDx)
                  .attr("dy", settings.node.textDy)
                  .text(function (d) {
                     // Do not display species in legend
                     if (d.data.name === "Unassigned" || d.data.rankName === "tree") {
                        if (d.data.taxNodeID === "legend") {
                           // Don't display "species" in the legend.
                           if (d.data.rankName === "species") {
                              // return "Species"; if you want to display "Species" in the rank column
                              return "";
                           }
                           return d.data.rankName;
                        } else if (
                           d.data.rankName === "realm" ||
                           d.data.has_assigned_siblings === true
                        ) {
                           return "Unassigned";
                        } else {
                           return "";
                        }
                     } else {
                        return d.data.name;
                     }
                  })
                  .attr("fill", function (d) {
                     return "#000000";
                  })
                  .on("click", function (e, d) {

                     // TODO: why is the value reset here?
                     fontSliderEl.attr("value", 4);

                     if (!d.data.name || d.data.name.length < 1 || d.data.name === "Unassigned" ||
                        !d.data.rankName || d.data.rankName.length < 1 ||
                        !d.data.taxNodeID || isNaN(parseInt(d.data.taxNodeID)) ||
                        !d.data.has_species) {

                        // Clear the species panel
                        return clearSpeciesPanel();

                     } else {

                        // Populate the species panel
                        return displaySpecies(d.data.name, d.data.rankName, d.data.taxNodeID);
                     }
                  })
                  .attr("dx", settings.node.textDx)
                  .attr("dy", settings.node.textDy)
                  .call(getBB);

               Enter.insert("rect", "text")
                  .attr("x", function (d) {
                     return d.bbox.x;
                  })
                  .attr("y", function (d) {
                     return d.bbox.y;
                  })
                  .attr("width", function (d) {
                     return d.bbox.width;
                  })
                  .attr("height", function (d) {
                     return d.bbox.height;
                  })
                  .style("fill", "white")
                  .attr("dx", settings.node.textDx)
                  .attr("dy", settings.node.textDy);

               var Update = Enter.merge(children);
               Update.transition()
                  .duration(settings.animationDuration)
                  .attr("transform", function (d) {
                     return "translate(" + d.y + "," + d.x + ")";
                  });

               // lrm 5-22-2024
               // instead of rect, append a circle to the nodes
               // this is done in the update circle.node function
               // TODO: Probably take this out, leaving it for now
               Update.select("rect")
                  .style("stroke", "black")
                  .style("stroke-width", "2px")
                  // .attr("width", function (d) {
                  //    if (d.data.name === "Unassigned") {
                  //       if (
                  //          d.data.rankName === "realm" &&
                  //          d.data.taxNodeID !== "legend"
                  //       ) {
                  //          return "30px";
                  //       } else if (
                  //          d.data.has_assigned_siblings === true ||
                  //          d.data.has_unassigned_siblings === true
                  //       ) {
                  //          return "30px";
                  //       } else {
                  //          return "0px";
                  //       }
                  //    }
                  // })
                  // .attr("height", function (d) {
                  //    if (d.data.name === "Unassigned") {
                  //       if (
                  //          d.data.rankName === "realm" &&
                  //          d.data.taxNodeID !== "legend"
                  //       ) {
                  //          return "30px";
                  //       } else if (
                  //          d.data.has_assigned_siblings === true ||
                  //          d.data.has_unassigned_siblings === true
                  //       ) {
                  //          return "30px";
                  //       } else {
                  //          return "0px";
                  //       }
                  //    }
                  // })
                  // .attr("x", function (d) {
                  //    if (d.data.name === "Unassigned") {
                  //       if (
                  //          d.data.rankName === "realm" &&
                  //          d.data.taxNodeID !== "legend"
                  //       ) {
                  //          return "-15px";
                  //       } else if (
                  //          d.data.has_assigned_siblings === true ||
                  //          d.data.has_unassigned_siblings === true
                  //       ) {
                  //          return "-15px";
                  //       } else {
                  //          return "0px";
                  //       }
                  //    }
                  // })
                  // .attr("y", function (d) {
                  //    if (d.data.name === "Unassigned") {
                  //       if (
                  //          d.data.rankName === "realm" &&
                  //          d.data.taxNodeID !== "legend"
                  //       ) {
                  //          return "-15px";
                  //       } else if (
                  //          d.data.has_assigned_siblings === true ||
                  //          d.data.has_unassigned_siblings === true
                  //       ) {
                  //          return "-15px";
                  //       } else {
                  //          return "0px";
                  //       }
                  //    }
                  // })
                  .attr("dx", settings.node.textDx)
                  .attr("dy", settings.node.textDy)
                  .style("fill", function (d) {

                     // lrm 5-23-2024
                     // this code is no longer needed, this will be taken down later
                     // if (this === clickedRect) {
                     //    // console.log(clickedCircle);
                     //    return "#006CB5";
                     // } else  if(this !== clickedRect){
                     //    return "white";
                     // }

                     findParent(d);
                  })
                  .attr("cursor", "pointer");

               Update.select("circle.node")

                  // append circle to all nodes but the invisible ghost nodes
                  .attr("r", function (d) {

                     if (isGhostNode(d)) {
                        return 0;
                     } else if (d.data.taxNodeID === "legend") {
                        return 0;
                     } else {
                        return settings.node.radius;
                     }
                  })
                  
                  .style("fill", function (d) {

                     // lrm 5-20-2024
                     // update DOM element's appended circle when clicked
                     if (this === clickedCircle) {
                        return "#006CB5";
                     } else  if(this !== clickedCircle){
                        return "white";
                     }

                     findParent(d);
                  })
                  .attr("cursor", "pointer")
                  .text(function (d, i) {
                     if (d.data.name === "Unassigned" || d.data.rankName === "tree") {
                        if (d.data.taxNodeID === "legend") {
                           return d.data.rankName;
                        } else if (
                           d.data.rankName === "realm" ||
                           d.data.has_unassigned_siblings === true
                        ) {
                           // TEST
                           return "";
                           //return "Unassigned";
                        } else {
                           return "";
                        }
                     } else {
                        return d.data.name;
                     }
                  })
                  .attr("fill", function (d) {
                     if (d.data.rankName === "genus" && genus == true) {
                        return "blue";
                     }

                     return "#000000";
                  });

               var font;

               // .attr('cursor', 'pointer')

               Update.select("text.node-text")
                  .attr("cursor", "pointer")
                  .style("fill", function (d) {

                     // lrm 5-30-2024
                     // clicked text is the highlighted text
                     // clickedText is global varible assigned in the click function
                     if(this == clickedText){
                        return "#006CB5";
                     } else {
                        return "#000000";
                     }
                  })
                  .style("font-size", fontSliderEl.property("value") + "rem");
               // Transform
               Update.select("text.legend-node-text")
                  .attr("transform", function (d, i) {
                     /*if (d.data.taxNodeID === "legend") {
                       return "rotate(-45 0,-110)";
                     }*/
                  })
                  .style("fill", function (d) {
                     findParent(d);
                  })
                  .style("font-size", fontSliderEl.property("value") + "rem");

               Update.select("text.unassigned-text")
                  .style("font-size", fontSliderEl.property("value") + "rem")
                  .style("fill", function (d) {

                     // lrm 6-10-2024
                     // clicked text is the highlighted text
                     // clickedText is global varible assigned in the click function
                     if(this == clickedText){
                        return "#006CB5";
                     } else {
                        return "#000000";
                     }
                  })
                  
               var Exit = children
                  .exit()
                  .transition()
                  .duration(settings.animationDuration)
                  .attr("transform", function (d) {
                     return "translate(" + source.y + "," + source.x + ")";
                  })
                  .remove();

               Exit.select("circle").attr("r", 1);

               Exit.select("text").style("fill-opacity", 1);

               var link = svg.selectAll("path.link").data(links, function (d) {
                  return d.id;
               });

               var linkEnter = link
                  .enter()
                  .insert("path", "g")
                  .attr("class", "link")
                  .attr("d", function (d) {

                     if (
                        ((d.data.rankName === "subgenus" &&
                           d.data.name == "Unassigned") ||
                           d.data.taxNodeID === "legend") &&
                        d.data.name === "Unassigned"
                     ) {
                        return diagonal(0, 0);

                     }

                     var pos = { x: source.x0, y: source.y0 };

                     return diagonal(pos, pos);

                  })
                  .style("stroke-width", "5px")
                  .style("fill", "none")
                  .style("stroke", "#ccc")
                  .style("display", function (d) {
                     if (
                        d.depth === 1 ||
                        (d.data.has_species === 0 &&
                           d.data.name == "Unassigned" &&
                           d.data.children === null) ||
                        d.data.taxNodeID === "legend"
                     ) {
                        //Is top link
                        return "none";
                     }
                  });

               // var linkUpdate = linkEnter.merge(link);
               var linkUpdate = linkEnter.merge(link);
                  

               linkUpdate
                  .transition("path.link")
                  .duration(settings.animationDuration)
                  .attr("d", function (d) {

                     // lrm 6-12-2024
                     // Do not draw links to ghost nodes
                     // This helps the link line colors stay consistent
                     if (!isGhostNode(d)) {
                        if (isGhostNode(d.parent)) {
                           return diagonal(findNonGhostParent(d.parent), d);
                        }
                        return diagonal(d.parent, d);
                     }
                  })

                  // Code to color the links
                  .style("stroke", function (d) {
                     // lrm 6-17-2024
                     // Check if the node is a leaf node and if it's the currently selected node
                     if ((!d.children && !d._children) && d === selectedNode) {
                        return "#006CB5";
                     } else if (d._children) {
                        return "#808080";
                     } else if (d.children) {
                        return "#006CB5";
                     } else {
                        return "#808080";
                     }

                     // original code for link color
                  //    if (d.data.name !== "down" || d.data.name !== "up") {
                  //       return d._children ? "#808080" : "#006CB5";
                  //    }
                  //    findParent(d);
                  });

               var linkExit = link
                  .exit()
                  .transition()
                  .duration(settings.animationDuration)
                  .attr("d", function (d) {
                     var pos = { x: source.x, y: source.y };
                     return diagonal(pos, pos);
                  })
                  .remove();

               parent.forEach(function (d) {
                  d.x0 = d.x;
                  d.y0 = d.y;
               });

               function diagonal(s, t) {
                  // Validate s and t
                  if (
                     !s ||
                     !t ||
                     isNaN(s.x) ||
                     isNaN(s.y) ||
                     isNaN(t.x) ||
                     isNaN(t.y)
                  )
                     return null;

                  path = `M ${s.y} ${s.x}
                                C ${(s.y + t.y) / 2} ${s.x},
                                ${(s.y + t.y) / 2} ${t.x},
                                ${t.y} ${t.x}`;

                  return path;
               }

               var simulation = d3
                  .forceSimulation()
                  .force("link", d3.forceLink().distance(500).strength(0.1));

               function findParent(par) {
                  if (par.depth < 2) {
                     return par.data.name;
                  } else {
                     return findParent(par.parent);
                  }
               }

               function findParentLinks(par) {
                  if (par.target.depth < 2) {
                     return par.target.name;
                  } else {
                     return findParent(par.target.parent);
                  }
               }

               function click(event, d) {
                  selected = d.data.name;

                  selectedNode = d;

                  // console.log(d);
                  if (d.data.taxNodeID !== "legend") {
                     if (d.hasOwnProperty("page")) {
                        d.parent.children = d.parent.pages[d.page];
                     } else if (d.children) {
                        d._children = d.children;
                        d.children = null;
                     } else if (d._children){
                        d.children = d._children;
                        d._children = null;
                     }

                     // lrm 5-20-2024
                     // clickedCircle is a  global variable declared at the top of the script
                     // here it is assigned for the purpose of updating the circle color when clicked
                     clickedCircle = event.currentTarget.querySelector("circle");
                     clickedText = event.currentTarget.querySelector("text");

                     update(d);
                  }
               }
               
               // lrm 5-20-2024
               // function to determine what is a ghost node
               function isGhostNode(d) {
                  if (!d || !d.data) {
                     return false;
                 }

                  if (d.data.rank_index === 0) {
                     // “Tree” has a rank index of zero and a numeric comparison is faster than a string comparison.
                     return false;
                  } else if ((d.data.is_assigned) || d.data.has_assigned_siblings) {
                     return false;
                  } else if (d.data.taxNodeID === "legend") {
                     return false;
                  } else {
                     return true;
                  }
               }

               // Function used in the linkUpdate code to help draw links from non-ghost node parents
               // Traverses the tree to check node's parents for ghost nodes
               // It will traverse until it finds a parent that is not a ghost node
               function findNonGhostParent(node) {
                  if (node.parent) {
                      if (isGhostNode(node.parent)) {
                          return findNonGhostParent(node.parent);
                      } else {
                          return node.parent;
                      }
                  } else {
                      return null; // or some default value
                  }
              }

               // function hasSpeciesChild(node) {
               //    if (node.children) {
               //       for (let i = 0; i < node.children.length; i++) {
               //          if (node.children[i].has_species) {
               //             return true;
               //          }
               //       }
               //    }
               //    return false;
               // }

               // The first parameter is the element that acts as a delegate for child elements with
               // tippy instances. The second parameter defines the tippy instances that will be assigned
               // to the child elements (qualified by the "target" attribute). 
               //
               // https://atomiks.github.io/tippyjs/
               window.tippy.delegate(`${containerSelector} svg`, {
                  allowHTML: true,
                  animation: settings.tooltip.animation,
                  appendTo: () => document.body,
                  delay: [settings.tooltip.showDelay, settings.tooltip.hideDelay],
                  interactive: true,
                  interactiveBorder: settings.tooltip.interactiveBorder,
                  onShow(instance) {

                     // Validate the instance
                     if (!instance || !instance.reference || !instance.reference.__data__ || !instance.reference.__data__.data) {

                        console.error("Invalid instance parameter in onShow()");

                        // Disable the instance so the tooltip won't display.
                        return instance.disable();
                     }

                     // Populate the child HTML with the child counts value (if it isn't empty).
                     const childCounts = instance.reference.__data__.data.child_counts;
                     const childHTML = !childCounts ? "" : childCounts;

                     // Get the name, rank, and taxnode ID attributes from the node data.
                     const name = instance.reference.__data__.data.name;
                     const rankName = instance.reference.__data__.data.rankName;
                     const taxNodeID = instance.reference.__data__.data.taxNodeID;

                     // Validate the attributes
                     if (!name || !rankName || !taxNodeID) { return instance.disable(); }

                     // The HTML content to display in the tooltip.
                     const html =
                        `<div class="ictv-tax-viz-tooltip">
                                    <div class="rank-and-name">${rankName}&nbsp;<i>${name}</i></div>
                                    <div class="child-count">${childHTML}</div>
                                    <div class="history">
                                        <a href="${taxonDetailsURL}?taxnode_id=${taxNodeID}" target="_blank">View taxon history</a>
                                    </div>
                                </div>`;

                     instance.setContent(html);
                  },
                  /*onTrigger(instance) {
                      // If the node's name is "Unassigned", disable the instance so it won't show a tooltip.
                      try {
                          if (instance.reference.__data__.data.name === "Unassigned") { instance.disable(); }
                      }
                      catch (error) {
                          // Nothing to do, really.
                      }
                  },*/
                  placement: "left-start",
                  target: "g.node text.node-text",
                  theme: "ICTV-Tooltip"
               })

            }
         }

      });

      return;
   }

   function collapse(d) {
      if (d.children) {

         if (d.data.name === name && counter < len - 1) {
            counter++;
            for (var i = 0; i < 1; i++) {
               var open = d.children[i];
               name = res[counter]
               if (d.children) {
                  d.children.forEach(collapse);
               }
               return;
            }
         } else {

            if (
               d.data.name === "Unassigned" &&
               d.data.rankName === "realm" &&
               d.data.taxNodeID !== "legend"
            ) {
               // No name, a rank of "realm", and not part of the legend.
               d._children = d.children;
               d._children.forEach(collapse);
               d.children = null;
            } else if (
               (d.data.name === "Unassigned") &&
               d.data.has_assigned_siblings !== true &&
               d.data.has_unassigned_siblings !== true
            ) {


               // No name and it doesn't have assigned or unassigned siblings (so no siblings?).
               // TODO: the if condition above can be simplified to:
               //      !d.data.name && !d.data.has_assigned_siblings && !d.data.has_unassigned_siblings

               // dmd 02/08/23 The for loop appears to be unnecessary.
               for (var i = 0; i < 1; i++) {
                  // dmd 02/08/23 "open" isn't referenced anywhere
                  var open = d.children[i];
                  d.children.forEach(collapse);
               }
            } else {
               // If the node has either assigned or unassigned siblings.
               // TODO: "if (d.data.children.name === null)"" can be included in the if condition below.
               if (
                  d.data.has_assigned_siblings === true ||
                  d.data.has_unassigned_siblings === true
               ) {
                  // TODO: does the "children" array have a name attribute?
                  if (d.data.children.name === null) {
                     d._children = d.children;
                     d._children.forEach(collapse);
                     d.children = null;
                  }
               }
               d._children = d.children;
               d._children.forEach(collapse);
               d.children = null;
            }
         }
      }

   }



   // This function is called when a search result is selected in the searchPanel. A reference to it is 
   // passed as a parameter to the search panel object's "constructor".
   // lrm 6-21-24
   // Instead of passing JSON IDs and JSON Lineage, pass taxNodeIDLineage and taxNodeId from callback function in searchPanel.js
   // JSON IDs were changing when updating DB, this caused the search to break here
   function selectSearchResult(event_, taxNodeId_, releaseNumber_, taxNodeIdLineage_) {

      // console.log(taxNodeId_);

      // Select the specified release.
      releaseControlEl.value = releaseNumber_;
      releaseControlEl.dispatchEvent(new Event("change"));

      // Trigger a click on the clear button.
      const clearButtonEl = document.querySelector(".search-panel .clear-button");
      if (!clearButtonEl) { throw new Error("Invalid clear button element"); }

      clearButtonEl.dispatchEvent(new Event("click"));

      async function openNode(nodeId) {
         return new Promise((resolve) => {
            let notResultNode = document.querySelector(`g[taxNodeId="${nodeId}"]`);
            notResultNode_ = notResultNode;
            // console.log(notResultNode_)
            if (!notResultNode) { 
               console.error(`No node found with data-id "${nodeId}"`); 
               return; 
            }

            // Call the displaySpecies function when the node has a species
            let hasSpecies = notResultNode.getAttribute('has_species');
            const parentName = notResultNode.getAttribute('parent-name');
            const parentRank = notResultNode.getAttribute('parent-rank');
            const parentTaxNodeID = notResultNode.getAttribute('taxNodeId');
            const children_ = notResultNode.getAttribute('children');
            
            if (hasSpecies !== '0' && children_ === null) {
               displaySpecies(parentName, parentRank, parentTaxNodeID);
            }

            // lrm 5-10-2024
            // Reset the color of all text to the default color
            // This ensures the search result node is the
            // only node that is highlighted
            document.querySelectorAll('text.node-text').forEach(textElementReset => {
               textElementReset.style.fill = "#000000";
            });

            // Highlight the last expanded node/search result node
            // This only works for searching nodes
            const textToHighlight = notResultNode.querySelector('text');
            // console.log("textToHighlight: ", textToHighlight);
            if (textToHighlight) {
               textToHighlight.style.fill = "#006CB5";
            }

            // lrm 6-24-2024
            // Reset the circle colors so that you only color the search result circle
            document.querySelectorAll('circle').forEach(circleElementReset => {
               circleElementReset.style.fill = "#FFFFFF";
            });
   
            // Ensure the search result's circle is blue
            const circleToHighlight = notResultNode.querySelector('circle');
            if (circleToHighlight) {
               circleToHighlight.style.fill = "#006CB5";
            }
            
            // when there is a ghost node, do not dispatch the click event
            // if (notResultNode.getAttribute('ghost-node') === 'true') {
            //    resolve();
            //    return;
            // }
            // if (notResultNode) {
            //    const textElement = notResultNode.querySelector('text');
            //    if (textElement && textElement.textContent === '') {
            //       // console.log("Ghost Node: ", nodeId);
            //       resolve();
            //       return;
            //    }
            // } else {
            //    // console.log(`No node found with data-id "${nodeId}"`);
            // }
            
            // when index value does not equal the data-id, open the node
            // if it is the target node, stop the loop
            if (nodeId !== taxNodeId_) {
               notResultNode.dispatchEvent(new Event("click"));
               // Store the node that had a simulated click
               simulatedClicks = notResultNode;
            } else {
               //console.log("Reached the target node: ", ID_);
               resolve();
               return;
            }

            // waiting set time for promise to resolve
            setTimeout(resolve, 1100);
            return; // dmd 043024
         });
      }

      async function openNodes() {
         // take the commas out of the array
         const lineage_array = taxNodeIdLineage_.split(",");
         for (let i = 1; i < lineage_array.length; i++) {
            await openNode(lineage_array[i]);
         }
      }

      setTimeout(openNodes, 1000);

      // TODO: Use lineage to select taxa nodes after the tree has been refreshed

      /*-------------------------------------------------------------------------------------------------------------------

      NOTE: this commented code is the previous attempt to select a node using taxnodeID. It worked in 
      some cases, but broke when there was a "ghost node". Ghost nodes are ranks that are missing 
      in a lineage. For example, in the lineage of species "White spot syndrome virus", there isn't a
      taxon with the rank "Order" between Class and Family:

         Class: Naldaviricetes
         Family: Nimaviridae
         Genus: Whispovirus
         Species: White spot syndrome virus

      I left the code here in case it provides any inspiration.
      
      -------------------------------------------------------------------------------------------------------------------


      // Older code
      name = "";
      const taxa = lineage_.split(">");
      taxa.forEach((taxon_) => {
         console.log(taxon_)
         name = taxa[0];
         collapse(name);
         console.log("name", taxon_.pa);

      })
      console.log(taxa.length)
      len = taxa.length
      Sflag = true;
      res = taxa;
      svg_zoom
         .transition()
         .call(
            zoom.transform,
            d3.zoomIdentity
               .translate(settings.zoom.translateX, settings.zoom.translateY)
               .scale(1 / 0.19)
         )
         .on("end", function () {
            svg_zoom.transition()
               .duration(750)
               .call(zoom.scaleBy, settings.zoom.scaleFactor);
         });*/
   }


};

function expandTreeToNode(data) {
   let node = traverseTreeToFindNode(ds, data);
   expandTree(node);
}


function traverseTreeToFindNode(currentNode, node) {
   if (currentNode.name === node) {
      return currentNode;
   }
   for (let i = 0; i < currentNode.children.length; i++) {
      let result = traverseTreeToFindNode(currentNode.children[i], node);
      if (result != null) {
         return result;
      }
   }
   return null;
}





