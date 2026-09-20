import { radius } from "@royal-navy/shared";
import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Card,
  Chip,
  ChipRow,
  Dialog,
  EmptyState,
  IconButton,
  ImageSlot,
  Input,
  Pill,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  ScrollRegion,
  SectionLabel,
  Segmented,
  Sheet,
  Skeleton,
  StepChecklist,
  Stepper,
  SunkenPanel,
  Toast,
  Toggle,
  ValidationPanel,
  ValueRow,
} from "../components";

/** Every component B3 delivered, in docs/03 order. The gallery must show each one. */
export const COMPONENT_NAMES = [
  "Screen",
  "ScreenHeader",
  "ScrollRegion",
  "Card",
  "SunkenPanel",
  "SectionLabel",
  "Sheet",
  "Dialog",
  "Toast",
  "Button",
  "IconButton",
  "Chip",
  "Pill",
  "Segmented",
  "Stepper",
  "Toggle",
  "Row",
  "ValueRow",
  "ProgressBar",
  "EmptyState",
  "ValidationPanel",
  "StepChecklist",
  "Input",
  "Skeleton",
  "ImageSlot",
] as const;

export interface GallerySection {
  name: (typeof COMPONENT_NAMES)[number];
  render: (state: GalleryState) => ReactNode;
}

interface GalleryState {
  segment: "card" | "list";
  setSegment: (value: "card" | "list") => void;
  chip: string;
  setChip: (value: string) => void;
  toggle: boolean;
  setToggle: (value: boolean) => void;
  stepper: number;
  setStepper: (value: number) => void;
  text: string;
  setText: (value: string) => void;
  sheetOpen: boolean;
  setSheetOpen: (value: boolean) => void;
  dialogOpen: boolean;
  setDialogOpen: (value: boolean) => void;
  toast: { id: string; message: string; icon?: string } | null;
  setToast: (value: { id: string; message: string; icon?: string } | null) => void;
}

const noop = () => undefined;

export const GALLERY_SECTIONS: readonly GallerySection[] = [
  // Screen, ScreenHeader and ScrollRegion are the gallery's own frame; their sections say so.
  { name: "Screen", render: () => <ValueRow label="This gallery" value="gradient + safe areas" /> },
  { name: "ScreenHeader", render: () => <ValueRow label="Header above" value="title + subtitle" /> },
  { name: "ScrollRegion", render: () => <ValueRow label="You are scrolling" value="the one scroll area" /> },
  {
    name: "Card",
    render: () => (
      <View style={styles.stack}>
        <Card kicker="RECENT MATCHES">
          <ValueRow label="Default" value="card" />
        </Card>
        <Card tone="danger">
          <ValueRow label="Danger" value="tone" />
        </Card>
        <Card tone="warn">
          <ValueRow label="Warn" value="tone" />
        </Card>
      </View>
    ),
  },
  {
    name: "SunkenPanel",
    render: () => (
      <SunkenPanel style={styles.panel}>
        <ValueRow label="Sunken" value="panel" />
      </SunkenPanel>
    ),
  },
  { name: "SectionLabel", render: () => <SectionLabel label="Money" meta="₹15,000" /> },
  {
    name: "Sheet",
    render: (s) => (
      <>
        <Button variant="secondary" label="Open sheet" onPress={() => s.setSheetOpen(true)} />
        <Sheet visible={s.sheetOpen} onDismiss={() => s.setSheetOpen(false)}>
          <ValueRow label="Inside" value="Sheet" />
          <Button variant="ghost" label="Close" onPress={() => s.setSheetOpen(false)} />
        </Sheet>
      </>
    ),
  },
  {
    name: "Dialog",
    render: (s) => (
      <>
        <Button variant="secondary" label="Open dialog" onPress={() => s.setDialogOpen(true)} />
        <Dialog
          visible={s.dialogOpen}
          title="Leave match?"
          body="Your seat stays open for 90 seconds."
          destructive
          icon="ph-warning"
          cancel={{ label: "Stay", onPress: () => s.setDialogOpen(false) }}
          confirm={{ label: "Leave", onPress: () => s.setDialogOpen(false) }}
        />
      </>
    ),
  },
  {
    name: "Toast",
    render: (s) => (
      <Button
        variant="secondary"
        label="Show toast"
        onPress={() => s.setToast({ id: String(Date.now()), message: "Report sent. Thanks — we'll take a look.", icon: "ph-check" })}
      />
    ),
  },
  {
    name: "Button",
    render: () => (
      <View style={styles.stack}>
        <View style={styles.pair}>
          <View style={styles.flex}>
            <Button variant="ghost" label="Later" onPress={noop} />
          </View>
          <View style={styles.flex}>
            <Button variant="primary" label="Play" onPress={noop} />
          </View>
        </View>
        <Button variant="secondary" label="Secondary" icon="ph-plus" onPress={noop} />
        <Button variant="confirm" label="Confirm" onPress={noop} />
        <Button variant="destructive" label="Delete account" onPress={noop} />
        <Button variant="text" label="Text button" onPress={noop} />
        <Button variant="primary" label="Disabled" onPress={noop} disabled />
        <Button variant="primary" label="Loading" onPress={noop} loading />
      </View>
    ),
  },
  {
    name: "IconButton",
    render: () => (
      <View style={styles.pair}>
        <IconButton icon="ph-gear" label="Settings" onPress={noop} />
        <IconButton icon="ph-bell" label="Alerts" onPress={noop} tone="accent" />
        <IconButton icon="ph-cloud-slash" label="Unpublish" onPress={noop} tone="danger" />
        <IconButton icon="ph-dots-three" label="Menu" onPress={noop} disabled />
      </View>
    ),
  },
  {
    name: "Chip",
    render: (s) => (
      <View style={styles.stack}>
        <View style={styles.pair}>
          <Chip label="Selected" selected onPress={noop} />
          <Chip label="Unselected" selected={false} onPress={noop} />
        </View>
        <ChipRow
          options={[
            { key: "all", label: "All 16" },
            { key: "property", label: "Property" },
            { key: "corner", label: "Corner" },
            { key: "utility", label: "Utility" },
            { key: "tax", label: "Tax" },
          ]}
          selectedKey={s.chip}
          onSelect={s.setChip}
        />
      </View>
    ),
  },
  {
    name: "Pill",
    render: () => (
      <View style={styles.pair}>
        <Pill label="neutral" />
        <Pill label="accent" tone="accent" />
        <Pill label="published" tone="gold" />
        <Pill label="completed" tone="green" />
        <Pill label="pending" tone="amber" />
        <Pill label="danger" tone="danger" />
      </View>
    ),
  },
  {
    name: "Segmented",
    render: (s) => (
      <Segmented
        label="View"
        options={[
          { key: "card", label: "Cards" },
          { key: "list", label: "List" },
        ]}
        selectedKey={s.segment}
        onSelect={s.setSegment}
      />
    ),
  },
  {
    name: "Stepper",
    render: (s) => (
      <Stepper value={s.stepper} min={2} max={11} step={1} suffix="rows" onChange={s.setStepper} label="Rows" {...(s.stepper < 4 ? { error: "At least 12 tiles needed." } : {})} />
    ),
  },
  {
    name: "Toggle",
    render: (s) => (
      <View style={styles.pair}>
        <Toggle value={s.toggle} onValueChange={s.setToggle} label="Event cards" />
        <Toggle value={!s.toggle} onValueChange={(v) => s.setToggle(!v)} label="Inverse" />
        <Toggle value onValueChange={noop} label="Disabled" disabled />
      </View>
    ),
  },
  {
    name: "Row",
    render: (s) => (
      <View style={styles.stack}>
        <Row title="Caret" meta="Goes somewhere" accessory={{ kind: "caret" }} onPress={noop} />
        <Row title="Value" accessory={{ kind: "value", value: "₹15,000" }} />
        <Row title="Toggle accessory" accessory={{ kind: "toggle", value: s.toggle, onValueChange: s.setToggle }} />
        <Row title="Radio · selected" accessory={{ kind: "radio", selected: true }} selected />
        <Row title="Check" accessory={{ kind: "check" }} />
        <Row title="Menu" accessory={{ kind: "menu", onPress: noop }} />
        <Row title="Disabled" accessory={{ kind: "caret" }} disabled onPress={noop} />
        <Row title="Locked" accessory={{ kind: "value", value: "on" }} locked />
        <Row title="Error" meta="Needs at least 3." error />
      </View>
    ),
  },
  { name: "ValueRow", render: () => <ValueRow label="Starting cash" value="₹15,000" meta="Board rule" onPress={noop} /> },
  {
    name: "ProgressBar",
    render: () => (
      <View style={styles.stack}>
        <ProgressBar progress={0.6} label="Slots filled" count="10 of 16" />
        <ProgressBar progress={1} label="Complete" count="16 of 16" />
      </View>
    ),
  },
  {
    name: "EmptyState",
    render: () => (
      <EmptyState icon="ph-cards" title="No decks yet" body="Build a deck and assign it to a board." action={{ label: "New deck", onPress: noop }} />
    ),
  },
  {
    name: "ValidationPanel",
    render: () => (
      <ValidationPanel
        errorsLabel={{ label: "Errors · 1", meta: "these block Save board" }}
        warningsLabel={{ label: "Warnings · 1", meta: "you can still save" }}
        errors={[{ id: "e1", title: "Two tiles share a name", meta: "Slot 4 and slot 9", onFix: noop }]}
        warnings={[{ id: "w1", title: "No utility tiles", onFix: noop }]}
        passing={[{ id: "p1", title: "Every slot assigned" }]}
      />
    ),
  },
  {
    name: "StepChecklist",
    render: () => (
      <StepChecklist
        kicker="PUBLISH CHECKS"
        footer="Each step unlocks the next · publishing replaces v2 for players"
        steps={[
          { id: "slots", title: "All slots assigned", state: "16 of 16", passed: true },
          { id: "rules", title: "Rules valid", state: "2 errors", passed: false, onFix: noop },
          { id: "decks", title: "Decks assigned", state: "locked", passed: false },
          { id: "name", title: "Name available", state: "locked", passed: false },
        ]}
      />
    ),
  },
  {
    name: "Input",
    render: (s) => (
      <View style={styles.stack}>
        <Input label="Game name" value={s.text} onChangeText={s.setText} weight={700} />
        <Input placeholder="Email" value="" onChangeText={noop} error="Enter a valid email." />
        <Input placeholder="Disabled" value="read only" onChangeText={noop} editable={false} />
      </View>
    ),
  },
  {
    name: "Skeleton",
    render: () => (
      <View style={styles.stack}>
        <Skeleton width={44} height={16} />
        <Skeleton width="100%" height={56} borderRadius={radius.card} />
      </View>
    ),
  },
  {
    name: "ImageSlot",
    render: () => (
      <View style={styles.pair}>
        <ImageSlot width={120} height={90} radius={14} caption={["illustration · toppled token"]} />
        <ImageSlot width={150} height={150} radius={24} caption={["img · illustration slot"]} captionSize={12} glyph="ph-cards" />
      </View>
    ),
  },
];

/** Dev-only storybook-style page: every design-system component in every state (gate B5). */
export function Gallery() {
  const [segment, setSegment] = useState<"card" | "list">("card");
  const [chip, setChip] = useState("all");
  const [toggle, setToggle] = useState(true);
  const [stepper, setStepper] = useState(5);
  const [text, setText] = useState("Friday night");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<GalleryState["toast"]>(null);

  const state: GalleryState = {
    segment, setSegment, chip, setChip, toggle, setToggle, stepper, setStepper,
    text, setText, sheetOpen, setSheetOpen, dialogOpen, setDialogOpen, toast, setToast,
  };

  return (
    <Screen>
      <ScreenHeader title="Component gallery" subtitle={`${GALLERY_SECTIONS.length} components · dev only`} />
      <ScrollRegion>
        {GALLERY_SECTIONS.map((section) => (
          <View key={section.name} style={styles.section}>
            <SectionLabel label={section.name} />
            {section.render(state)}
          </View>
        ))}
      </ScrollRegion>
      <Toast toast={toast} onHidden={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 9 },
  stack: { gap: 9 },
  pair: { flexDirection: "row", flexWrap: "wrap", gap: 9, alignItems: "center" },
  flex: { flex: 1 },
  panel: { padding: 12 },
});
