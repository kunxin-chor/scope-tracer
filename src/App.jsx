import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button 
} from 'react-bootstrap';
import Editor from "@monaco-editor/react";

const ScopeTracer = () => {
  const [code, setCode] = useState(`function outer() {
  let a = 1;
  if (true) {
    let b = 2;
    for (let i = 0; i < 3; i++) {
      let c = 3;
    }
  } 
}
outer();`);

  const [highlightedVariable, setHighlightedVariable] = useState(null);
  const [scopes, setScopes] = useState([]);
  const [allVariables, setAllVariables] = useState(new Set());

  const analyzeCode = () => {
    const scopeStack = [{ name: 'Global', variables: [], children: [], color: '#FFB3BA' }];
    let currentScope = scopeStack[0];
    const allVars = new Set();
    
    const lines = code.split('\n');
    let braceCount = 0;

    lines.forEach((line, index) => {
      // Function declaration
      const funcDeclaration = line.match(/function\s+(\w+)/);
      if (funcDeclaration) {
        const funcName = funcDeclaration[1];
        currentScope.variables.push(funcName);
        allVars.add(funcName);
        const newScope = { name: funcName, variables: [], children: [], color: getRandomColor() };
        currentScope.children.push(newScope);
        scopeStack.push(newScope);
        currentScope = newScope;
        braceCount++;
      }

      // Block scopes (if, for, while)
      const blockScope = line.match(/\b(if|for|while)\b/);
      if (blockScope) {
        const blockType = blockScope[1];
        const newScope = { name: `${blockType}-block`, variables: [], children: [], color: getRandomColor() };
        currentScope.children.push(newScope);
        scopeStack.push(newScope);
        currentScope = newScope;
        braceCount++;
      }

      // Variable declarations
      const varDeclarations = line.match(/(?:let|const|var)\s+(\w+)/g);
      if (varDeclarations) {
        varDeclarations.forEach(declaration => {
          const varName = declaration.split(/\s+/)[1];
          if (!currentScope.variables.includes(varName)) {
            currentScope.variables.push(varName);
            allVars.add(varName);
          }
        });
      }

      // Function parameters
      const funcParams = line.match(/function\s+\w+\s*\((.*?)\)/);
      if (funcParams && funcParams[1]) {
        const params = funcParams[1].split(',').map(param => param.trim());
        currentScope.variables.push(...params);
        params.forEach(param => allVars.add(param));
      }

      // For loop variables
      const forLoopVars = line.match(/for\s*\((.*?)\)/);
      if (forLoopVars && forLoopVars[1]) {
        const loopVars = forLoopVars[1].match(/(?:let|const|var)\s+(\w+)/g);
        if (loopVars) {
          loopVars.forEach(declaration => {
            const varName = declaration.split(/\s+/)[1];
            if (!currentScope.variables.includes(varName)) {
              currentScope.variables.push(varName);
              allVars.add(varName);
            }
          });
        }
      }

      if (line.includes('{')) braceCount++;
      if (line.includes('}')) {
        braceCount--;
        if (braceCount === scopeStack.length - 1) {
          scopeStack.pop();
          currentScope = scopeStack[scopeStack.length - 1];
        }
      }
    });

    setScopes([scopeStack[0]]);
    setAllVariables(allVars);
  };

  const getRandomColor = () => {
    const letters = '89ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 8)];
    }
    return color;
  };

  const handleCodeChange = (event) => {
    setCode(event.target.value);
  };

  const handleVariableHover = (variable) => {
    setHighlightedVariable(variable);
  };

  const renderCode = () => {
    let indentLevel = 0;
    return code.split('\n').map((line, lineIndex) => {
      // Decrease indent for closing braces at the start of the line
      if (line.trim().startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      const indentedLine = '  '.repeat(indentLevel) + line.trim();
      
      // Increase indent for opening braces at the end of the line
      if (line.trim().endsWith('{')) {
        indentLevel++;
      }

      return (
        <div key={lineIndex} style={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
          {indentedLine.split(/\b/).map((part, partIndex) => {
            const isVariable = allVariables.has(part);
            return isVariable ? (
              <span
                key={partIndex}
                style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  backgroundColor: highlightedVariable === part ? 'yellow' : 'transparent'
                }}
                onMouseEnter={() => handleVariableHover(part)}
                onMouseLeave={() => handleVariableHover(null)}
              >
                {part}
              </span>
            ) : (
              <span key={partIndex}>{part}</span>
            );
          })}
        </div>
      );
    });
  };

  const renderVariableLabel = (variable) => (
    <span
      key={variable}
      className={`badge me-1 mb-1 ${highlightedVariable === variable ? 'bg-warning' : 'bg-light text-dark'}`}
      style={{
        cursor: 'pointer',
      }}
      onMouseEnter={() => handleVariableHover(variable)}
      onMouseLeave={() => handleVariableHover(null)}
    >
      {variable}
    </span>
  );

  const renderScope = (scope, depth = 0) => (
    <Card 
      key={`${scope.name}-${depth}`}
      className="mb-2"
      style={{ marginLeft: `${depth * 20}px`, backgroundColor: scope.color }}
    >
      <Card.Body>
        <Card.Title>{scope.name}</Card.Title>
        <div className="d-flex flex-wrap mb-2">
          {scope.variables.map(renderVariableLabel)}
        </div>
        {scope.children.map((childScope, index) => renderScope(childScope, depth + 1))}
      </Card.Body>
    </Card>
  );

  const handleEditorChange = (value, event) => {
    setCode(value);
  };

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Enter your JavaScript code:</Card.Title>
              <div style={{ height: "400px", border: "1px solid #ccc" }}>
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  defaultValue={code}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                Click the button below to analyze the code to draw the scope diagram.
              </div>
              <Button variant="primary" onClick={analyzeCode} className="mt-3">Analyze Code</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Code Display:</Card.Title>
              <div className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {renderCode()}
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title>Scope Diagram:</Card.Title>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {scopes.map(scope => renderScope(scope))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ScopeTracer;