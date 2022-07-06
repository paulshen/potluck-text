import { computed, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import {
  Snippet,
  snippetTypesMobx,
  snippetTypeViewConfigurationsMobx,
  textEditorStateMobx,
} from "./primitives";

export const SnippetTokenHovercardContent = observer(
  ({ snippet }: { snippet: Snippet }) => {
    const snippetType = snippetTypesMobx.get(snippet.snippetTypeId)!;
    const viewConfig = snippetTypeViewConfigurationsMobx.get(
      snippet.snippetTypeId
    )!;

    const togglePropertyVisible = (propertyId: string) => {
      runInAction(() => {
        if (viewConfig.inlineVisiblePropertyIds.includes(propertyId)) {
          viewConfig.inlineVisiblePropertyIds =
            viewConfig.inlineVisiblePropertyIds.filter(
              (id) => id !== propertyId
            );
        } else {
          viewConfig.inlineVisiblePropertyIds.push(propertyId);
        }
      });
    };

    return (
      <div className="p-4 text-sm">
        <table>
          <thead>
            <tr>
              <th></th>
              <th></th>
              <th className="text-gray-500 text-sm">Inline?</th>
            </tr>
          </thead>
          <tbody>
            {snippetType.properties.map((property) => (
              <tr key={property.id}>
                <td className="px-2">{property.name}</td>
                <td className="px-2">
                  {snippet.data[property.id] ?? (
                    <span className="text-gray-400">Unknown</span>
                  )}
                </td>
                <td className="px-2">
                  <input
                    type="checkbox"
                    checked={viewConfig.inlineVisiblePropertyIds.includes(
                      property.id
                    )}
                    onChange={() => togglePropertyVisible(property.id)}
                  ></input>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);
