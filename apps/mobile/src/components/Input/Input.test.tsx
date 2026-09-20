import { fireEvent, render, screen } from "@testing-library/react-native";
import { danger, radius, surface, text } from "@royal-navy/shared";

import { Input } from "./index";

describe("Input", () => {
  it("renders a 50 dp field with radius 17, the input border, no fill and 15 dp white text", () => {
    render(<Input placeholder="Email" value="" onChangeText={jest.fn()} />);

    expect(screen.getByTestId("input-field")).toHaveStyle({
      height: 50,
      borderRadius: radius.input,
      borderWidth: surface.inputBorder.width,
      borderColor: surface.inputBorder.color,
      backgroundColor: "transparent",
      fontSize: 15,
      color: text.primary,
      fontFamily: "Baloo2-SemiBold",
    });
  });

  it("renders the label above the field in 14 dp secondary text", () => {
    render(<Input label="Game name" value="" onChangeText={jest.fn()} weight={700} />);

    expect(screen.getByText("Game name")).toHaveStyle({ fontSize: 14, color: text.secondary });
    expect(screen.getByLabelText("Game name")).toHaveStyle({ fontFamily: "Baloo2-Bold" });
  });

  it("reports text changes", () => {
    const onChangeText = jest.fn();
    render(<Input placeholder="Email" value="" onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "naveen@example.com");
    expect(onChangeText).toHaveBeenCalledWith("naveen@example.com");
  });

  it("shows an inline danger error and a danger border", () => {
    render(<Input placeholder="Email" value="x" onChangeText={jest.fn()} error="Enter a valid email." />);

    expect(screen.getByText("Enter a valid email.")).toHaveStyle({ color: danger.text });
    expect(screen.getByTestId("input-field")).toHaveStyle({ borderColor: danger.border });
  });

  it("renders disabled at 45% when not editable", () => {
    render(<Input placeholder="Email" value="x" onChangeText={jest.fn()} editable={false} />);

    expect(screen.getByTestId("input-field")).toHaveStyle({ opacity: 0.45 });
  });
});
