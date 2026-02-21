import React from 'react';
import OverworldLocation from './OverworldLocation';
import LocationLabel from './LocationLabel';

const OverworldLocations = (props) => {

    //Create a list of the x and y for each building
    let locations = [];
    let createLocation = function(location, x, y) {
        locations.push({location: location, x: x, y:y});
    };

    //Add all the locations to the map
    let locationWidth = props.width / 4.5
    let locationHeight = props.height / 4.5
    let currentY = 0
    if (props.scenario.locations.length >= 9) {
        let locationStartX = (props.width / 2) - (locationWidth / 2) - (((3 * locationWidth) / 2) - (locationWidth / 4))
        
        let currentX = locationStartX
        currentY = props.height * 0.12
        for (let i = 0; i < 3; i++) {
            createLocation(props.scenario.locations[i], currentX, currentY)
            currentX += locationWidth
        }

        currentY += locationHeight
        currentX = locationStartX + locationWidth / 2
        for (let i = 3; i < 6; i++) {
            createLocation(props.scenario.locations[i], currentX, currentY)
            currentX += locationWidth
        }

        currentY += locationHeight
        currentX = locationStartX
        for (let i = 6; i < props.scenario.locations.length; i++) {
            createLocation(props.scenario.locations[i], currentX, currentY)
            currentX += locationWidth
        }

        //increment this so the chibis show up in the correct spot
        currentY += 96
    }
    else if (props.scenario.locations.length % 2) {
        let locationStartX = (props.width / 2) - (locationWidth / 2) - ((((props.scenario.locations.length / 2) * locationWidth) / 2) - (locationWidth / 4))
        let currentX = locationStartX
        currentY = props.height * 0.2
        for (let i = 0; i <= Math.floor(props.scenario.locations.length / 2); i++) {
            createLocation(props.scenario.locations[i], currentX, currentY)
            currentX += locationWidth
        }
        currentY += locationHeight
        currentX = locationStartX + locationWidth / 2
        for (let i = Math.floor(props.scenario.locations.length / 2) + 1; i < props.scenario.locations.length; i++) {
            createLocation(props.scenario.locations[i], currentX, currentY)
            currentX += locationWidth
        }

        //increment this so the chibis show up in the correct spot
        currentY += 132
    }
    else {
        let locationStartX = (props.width / 2) - (locationWidth / 2) - ((((props.scenario.locations.length / 2) * locationWidth) / 2) - (locationWidth / 4))
        let currentX = locationStartX
        currentY = props.height * 0.2
        for (let i = 0; i < Math.floor(props.scenario.locations.length / 2); i++) {
            createLocation(props.scenario.locations[i], currentX, currentY)
            currentX += locationWidth
        }
        currentY += locationHeight
        currentX = locationStartX + locationWidth / 2
        for (let i = Math.floor(props.scenario.locations.length / 2); i < props.scenario.locations.length; i++) {
            createLocation(props.scenario.locations[i], currentX, currentY)
            currentX += locationWidth
        }

        //increment this so the chibis show up in the correct spot
        currentY += 132
    }

    const listLocations = locations.map((location) => 
        <OverworldLocation 
            key={location.location._id}
            location={location.location} 
            x={location.x} 
            y={location.y}
            widthMultiplier={props.widthMultiplier}
            heightMultiplier={props.heightMultiplier}/>
    );
    const listButtons = locations.map((location) => 
        <LocationLabel 
            key={location.location._id}
            x={location.x}
            y={location.y}
            style={{zIndex:4}}
            width={512 * props.widthMultiplier}
            height={341 * props.heightMultiplier}
            location={location.location} />
    );

    return (
        <>
            {listLocations.length > 0 ? ( 
                <>
                    {listLocations}
                    {listButtons}
                </>
            ):(
                <></>
            )}
        </>
    );
}

export default OverworldLocations;