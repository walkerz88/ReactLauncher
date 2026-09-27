/// <reference types="react-scripts" />

// react-scripts declares `*.module.css` (CSS Modules) but not plain stylesheet
// imports, which are side-effect only. TS >= 5 reports TS2882 without this.
declare module '*.css';
declare module '*.scss';
declare module '*.sass';
