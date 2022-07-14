// OLD CODE THAT MAY BE USEFUL FOR HIGHLIGHTER
// const dragSnippetPlugin = ViewPlugin.fromClass(
//   class {
//     lastUpdate: any;
//     constructor(view: EditorView) {}
//     update(update: ViewUpdate) {
//       this.lastUpdate = update;
//     }
//     destroy() {}
//   },
//   {
//     eventHandlers: {
//       mousedown(event, view) {
//         if (event.metaKey) {
//           const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
//           if (pos === null) {
//             return;
//           }
//           const snippetRanges: [
//             range: SelectionRange,
//             snippetId: string | undefined
//           ][] = view.state.field(snippetsField).map((snippet) => {
//             const [from, to] = snippet.span;
//             return [EditorSelection.range(from, to), snippet.id];
//           });
//           snippetRanges.push(
//             ...view.state.selection.ranges
//               .filter((range) => !range.empty)
//               .map<[SelectionRange, undefined]>((range) => [range, undefined])
//           );
//           const overlappingSnippetRange = snippetRanges.find(
//             ([range]) => pos >= range.from && pos < range.to
//           );
//           if (overlappingSnippetRange !== undefined) {
//             const [range, snippetId] = overlappingSnippetRange;
//             const fromPos = view.coordsAtPos(range.from)!;
//             const left = fromPos.left - 8;
//             const top = fromPos.top - 5;
//             dragNewSnippetEmitter.emit("start", {
//               snippetId,
//               textId: view.state.facet(textIdFacet),
//               spanPosition: [left, top],
//               span: [range.from, range.to],
//               mouseOffset: [left - event.clientX, top - event.clientY],
//               text: view.state.sliceDoc(range.from, range.to),
//               shiftKey: event.shiftKey,
//               altKey: event.altKey,
//             });
//             // We only want to drag out a single snippet
//             return true;
//           } else {
//             const suggestions = view.state.field(highlightsField);
//             const suggestionAtPos = suggestions.find(
//               (suggestion) =>
//                 pos >= suggestion.span[0] && pos < suggestion.span[1]
//             );
//             if (suggestionAtPos !== undefined) {
//               const textId = view.state.facet(textIdFacet);
//               runInAction(() => {
//                 createSnippetFromSpan(
//                   textId,
//                   suggestionAtPos.span,
//                   suggestionAtPos.highlighterTypeId
//                 );
//               });
//               return true;
//             }
//           }
//         }
//       },
//     },
//   }
// );

// const ANNOTATION_TOKEN_CLASSNAME = "annotation-token";
// class SnippetDataWidget extends WidgetType {
//   constructor(
//     readonly snippetId: string,
//     readonly snippetData: { [key: string]: string },
//     readonly snippetProperties: string[]
//   ) {
//     super();
//   }

//   eq(other: WidgetType): boolean {
//     return (
//       other instanceof SnippetDataWidget &&
//       comparer.structural(this.snippetData, other.snippetData) &&
//       comparer.structural(this.snippetProperties, other.snippetProperties)
//     );
//   }

//   toDOM() {
//     const root = document.createElement("span");
//     root.className = "relative";
//     const wrap = document.createElement("span");
//     root.appendChild(wrap);
//     wrap.className = "absolute bottom-full left-0 flex gap-1";
//     wrap.setAttribute("aria-hidden", "true");
//     if (this.snippetData === undefined) {
//       return wrap;
//     }
//     for (const [key, value] of Object.entries(this.snippetData)) {
//       if (value === undefined) {
//         continue;
//       }
//       const token = document.createElement("span");
//       token.className = `${ANNOTATION_TOKEN_CLASSNAME} text-gray-500 text-[8px] leading-[8px] whitespace-nowrap relative top-0.5`;
//       token.innerText = value;
//       token.setAttribute("data-snippet-id", this.snippetId);
//       token.setAttribute("data-snippet-property-name", key);
//       wrap.appendChild(token);
//     }
//     return root;
//   }

//   ignoreEvent(event: Event): boolean {
//     return false;
//   }
// }

// OLD CODE THAT MAY BE USEFUL FOR HIGHLIGHTS
// reaction(
//   () => {
//     const snippets = [...snippetsMobx.values()].filter(
//       (snippet) => snippet.textId === textId
//     );
//     return snippets.map((snippet) => {
//       const snippetType = highlighterTypesMobx.get(
//         snippet.snippetTypeId
//       )!;
//       const snippetTypeConfig = snippetTypeViewConfigurationsMobx.get(
//         snippet.snippetTypeId
//       )!;

//       // Get the inline properties that are visible,
//       // in the order that they're declared on the snippet type
//       const inlineProperties = snippetType.properties
//         .map((p) => p.id)
//         .filter((propertyId) =>
//           snippetTypeConfig.inlineVisiblePropertyIds.includes(propertyId)
//         );
//       const inlineVisibleData = pick(snippet.data, inlineProperties);
//       return {
//         ...snippet,
//         data: inlineVisibleData,
//         properties: inlineProperties,
//       };
//     });
//   },
//   (snippets) => {
//     view.dispatch({
//       effects: [setSnippetsEffect.of(snippets)],
//     });
//   },
//   { equals: comparer.structural }
// ),
