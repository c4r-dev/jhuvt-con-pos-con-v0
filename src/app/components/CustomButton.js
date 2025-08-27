"use client";

import Button from "@mui/material/Button";
import PropTypes from "prop-types";

// CustomButton Component
// Purpose: Reusable button with extensive styling options
// Features:
// - Multiple color schemes
// - Variant support (text, contained, outlined)
// - Custom styles via props
// Note: Consider adding loading states and icon support
// for more versatile usage
export default function CustomButton({
    onClick = () => {},
    disabled = false,
    children,
    ariaLabel,
    customStyles,
    variant,
    type,
    className
}) {

    /* Color Lookup Table 
    Neutrals
        Black: #202020
        Dark Gray: #F3F3F3
        Int Dark Gray (Simply "Gray"): #E0E0E0
        Int Light Gray (Simply "Light Gray"): #A2A2A2
        Light Gray (Simply "Background Gray"): #333132
        White: #FFFFFF

    Opacities
        White: #FFFFFF
        Opacity 90: #FFFFFF90
        Opacity 70: #FFFFFF70
        Opacity 50: #FFFFFF50
        Opacity 20: #FFFFFF20

    Primary Colors:
        DarkPink: '#F031DD',
        Purple: '#6F00FF',
        Blue: '#00A3FF',
        Green: '#00C802',
        Yellow: '#FFC800',
        BrightOrange: '#FF5A00',
    
    Secondary Colors:
        LightPink: '#FF7EF2',
        LightPurple: '#E8D7FF',
        DarkPurple: '#5700CA',
        DarkBlue: '#1859D7',
        LightBlue: '#39E1F8',
        BlueOpacity40: 'rgba(0, 163, 255, 0.4)',
        GreenOpacity80: 'rgba(0, 200, 2, 0.8)',
        ElectricGreen: '#A0FF00',
        LightYellow: '#F4F734',
        LightOrange: '#FFA800',
        Orange: '#FF7A00',
    */

    // Actual implementation of color lookup tables here
    const neutralColors = {
        black: '#202020',
        darkGray: '#F3F3F3',
        gray: '#E0E0E0',
        lightGray: '#A2A2A2',
        backgroundGray: '#333132',
        white: '#FFFFFF',
    }

    const opacityVariants = {
        white: '#FFFFFF',
        opacity90: '#FFFFFF90',
        opacity70: '#FFFFFF70',
        opacity50: '#FFFFFF50',
        opacity20: '#FFFFFF20',
    }

    const primaryColors = {
        darkPink: '#F031DD',
        purple: '#6F00FF',
        blue: '#00A3FF',
        green: '#00C802',
        yellow: '#FFC800',
        brightOrange: '#FF5A00',
    }

    const secondaryColors = {
        lightPink: '#FF7EF2',
        lightPurple: '#E8D7FF',
        darkPurple: '#5700CA',
        darkBlue: '#1859D7',
        lightBlue: '#39E1F8',
        blueOpacity40: 'rgba(0, 163, 255, 0.4)',
        greenOpacity80: 'rgba(0, 200, 2, 0.8)',
        electricGreen: '#A0FF00',
        lightYellow: '#F4F734',
        lightOrange: '#FFA800',
        orange: '#FF7A00',
    }

    const baseStyles = {
        fontFamily: 'var(--font-general-sans-semi-bold)',
        width: 'fit-content',
        padding: { xs: '8px 16px', sm: '10px 20px' },
        fontSize: { xs: '0.875rem', sm: '1rem' },
        backgroundColor: 'purple', // Purple background
        color: 'white', // White text
        borderRadius: '8px', // Rounded edges
        '&:hover': {
            backgroundColor: 'darkviolet', // Darker shade on hover
        },
        '&:disabled': {
            backgroundColor: 'lightgray', // Light gray when disabled
        },
    };   

    const primaryVariant = {
        backgroundColor: neutralColors.black,
        color: neutralColors.white,
        // Hovering
        '&:hover': {
            backgroundColor: primaryColors.purple,
        },
        // Pressing
        '&:active': {
            backgroundColor: secondaryColors.darkPurple,
        },
        // Disabled 
        '&:disabled': {
            backgroundColor: neutralColors.lightGray,
            color: 'grey',
        },
    }

    const greyVariant = {
        backgroundColor: '#676767',
        color: 'white',
        '&:hover': {
            backgroundColor: '#4a4a4a', // Darker shade on hover
        },
        '&:disabled': {
            backgroundColor: '#4a4a4a', // Light gray when disabled
            color: 'grey',
        },
    }

    const blueVariant = {
        backgroundColor: '#6e00ff',
        color: 'white',
        '&:hover': {
            backgroundColor: '#5801d0', // Darker shade on hover
        },
        '&:disabled': {
            backgroundColor: '#4a4a4a', // Light gray when disabled
            color: 'grey',
        },
    }

    const tertiaryVariant = {
        backgroundColor: neutralColors.white,
        color: neutralColors.black,
        '&:hover': {
            backgroundColor: neutralColors.lightGray,
        },
        '&:active': {
            backgroundColor: neutralColors.lightGray,
        },
        '&:disabled': {
            backgroundColor: opacityVariants.opacity20,
            color: 'grey',
        },
    }
    const styleVariants = {
        grey: greyVariant,
        blue: blueVariant,
        tertiary: tertiaryVariant,
        primary: primaryVariant,
        // Add more variants here as needed
    };

    const combinedStyles = {
        ...baseStyles,
        ...(styleVariants[variant] || {}),
    };

    const combinedCustomStyles = {
        ...combinedStyles,
        ...customStyles,
    };

    return (
        <Button 
            onClick={onClick} 
            disabled={disabled} 
            aria-label={ariaLabel}
            sx={combinedCustomStyles}
            className={className}
        >
            {children}
        </Button>
    );
}

CustomButton.propTypes = {
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    children: PropTypes.node.isRequired,
    ariaLabel: PropTypes.string.isRequired,
    variant: PropTypes.string,
    customStyles: PropTypes.object,
};