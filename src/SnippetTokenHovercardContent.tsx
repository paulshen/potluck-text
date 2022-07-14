import { sortBy } from "lodash";
import { computed, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import {
  Snippet,
  highlighterTypesMobx,
  snippetTypeViewConfigurationsMobx,
  textEditorStateMobx,
} from "./primitives";
import { PropertyList } from "./PropertyList";

export const SnippetTokenHovercardContent = observer(
  ({ snippet }: { snippet: Snippet }) => {
    const snippetType = highlighterTypesMobx.get(snippet.snippetTypeId)!;
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

    const reorderProperties = (ids: string[]) => {
      runInAction(() => {
        snippetType.properties = ids.map(
          (id) => snippetType.properties.find((p) => p.id === id)!
        );
      });
    };

    const propertyListItems = snippetType.properties.map((property) => ({
      id: property.id,
      name: property.name,
      value: snippet.data[property.id],
      actions: property.actions ?? [],
      show: viewConfig.inlineVisiblePropertyIds.includes(property.id),
    }));

    return (
      <div>
        <PropertyList
          snippet={snippet}
          title={`${snippetType.icon} ${snippetType.name}`}
          items={propertyListItems}
          togglePropertyVisible={togglePropertyVisible}
          reorderItems={reorderProperties}
        />
      </div>
    );
  }
);
