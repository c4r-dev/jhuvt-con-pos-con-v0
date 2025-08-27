# ReactFlow Designer

A customizable flowchart designer built with ReactFlow, allowing users to create interactive flowcharts with custom nodes.

## Features

- Create and edit custom nodes with various interactive elements:
  - Labels
  - Text boxes
  - Toggles
  - Dropdowns
  - Input fields
  - Input and output handles
  - Custom background and text colors
- Save and load flows using MongoDB database:
  - Name and describe your flowcharts
  - Organize multiple flowcharts
- Node commenting system with categorization:
  - Add comments to specific nodes
  - Categorize comments by type (question, feedback, suggestion, etc.)
  - All comments stored in MongoDB database
- Export and import flows as JSON files
- Toggle between build mode and use mode
- Fully responsive design
- **AI-Powered Transformations**: Use natural language to modify your flowcharts

## Project Structure

```
src/
├── app/                      # Next.js app directory
│   ├── components/           # Shared components
│   │   └── NavBar.js         # Navigation bar component
│   │
│   ├── pages/                # Application pages
│   │   ├── designer/         # Flow design page
│   │   │   ├── components/   # Designer-specific components
│   │   │   └── utils/        # Designer utilities
│   │   │
│   │   └── flow-viewer/      # Flow viewer page
│   │       └── components/   # Viewer-specific components
│   │
│   ├── globals.css           # Global styles
│   └── layout.js             # App layout
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000/pages/designer](http://localhost:3000/pages/designer) in your browser.

## Build vs Use Mode

- **Build Mode**: Allows you to create and edit nodes, connect them with edges, and save your flow.
- **Use Mode**: Disables editing features and allows interaction with the nodes (toggling, selecting from dropdowns, etc.).

## Using the AI Transformation Feature

The flowchart designer includes an AI-powered transformation feature that lets you modify your flowcharts using natural language instructions.

### How to Use:

1. Create or load a flowchart in the designer
2. Click the "AI Transform" button in the toolbar
3. Enter your instructions describing the changes you want to make
4. Click "Transform" to apply the changes

### Example Instructions:

- "Add a new node called 'Data Validation' with a blue background"
- "Change all red nodes to have green backgrounds"
- "Connect the 'Process' node to the 'Output' node"
- "Add dropdown options 'High', 'Medium', and 'Low' to the 'Priority' node"
- "Make all nodes with 'Input' in their name have input handles on all sides"

### Technical Details:

The transformation works by:
1. Sending your current flowchart JSON data and your instructions to an API endpoint
2. Processing the request using OpenAI's GPT-4 model
3. Receiving a modified flowchart JSON structure
4. Applying the changes to your current flowchart

If the transformation fails, your original flowchart will remain unchanged.


