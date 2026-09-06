import {
  getFormProps,
  getInputProps,
  getTextareaProps,
  useForm,
} from "@conform-to/react";
import { parseWithValibot } from "@conform-to/valibot";
import type { CreateRecipeInput } from "@misette/api-contract";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Input,
  Label,
  TextArea,
  TextField,
} from "react-aria-components";
import { css } from "styled-system/css";
import * as v from "valibot";

const nullableStringSchema = v.pipe(
  v.string(),
  v.transform((value) => value.trim() || null)
);
const nullableNumberSchema = v.pipe(
  v.string(),
  v.transform((value) => (value.trim() ? Number(value) : null)),
  v.nullable(v.number())
);
const nullableMinutesSchema = v.pipe(
  nullableNumberSchema,
  v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))
);
const recipeFormSchema = v.object({
  changeNote: nullableStringSchema,
  cookingTimeMinutes: nullableMinutesSchema,
  description: nullableStringSchema,
  ingredients: v.optional(
    v.array(
      v.object({
        displayName: v.pipe(v.string(), v.trim(), v.minLength(1)),
        note: nullableStringSchema,
        quantityText: nullableStringSchema,
        quantityUnit: nullableStringSchema,
        quantityValue: nullableNumberSchema,
      })
    ),
    []
  ),
  servingsText: nullableStringSchema,
  source: v.object({
    sourceName: nullableStringSchema,
    sourceType: v.picklist(["original", "website", "book", "other"]),
    sourceUrl: nullableStringSchema,
  }),
  steps: v.optional(
    v.array(
      v.object({
        body: v.pipe(v.string(), v.trim(), v.minLength(1)),
      })
    ),
    []
  ),
  title: v.pipe(v.string(), v.trim(), v.minLength(1, "タイトルは必須です")),
});

type RecipeFormInput = v.InferInput<typeof recipeFormSchema>;
type RecipeFormOutput = v.InferOutput<typeof recipeFormSchema>;

export interface RecipeFormValue {
  changeNote: string | null;
  recipe: CreateRecipeInput;
}

interface RecipeFormProps {
  conflictRecipeId?: string | undefined;
  initialValue?: CreateRecipeInput & { changeNote?: string | null };
  isPending: boolean;
  mode: "create" | "revision";
  onSubmit: (value: RecipeFormValue) => void;
}

const defaultRecipe: CreateRecipeInput = {
  cookingTimeMinutes: null,
  description: null,
  ingredients: [],
  servingsText: null,
  source: {
    sourceName: null,
    sourceType: "original",
    sourceUrl: null,
  },
  steps: [],
  title: "",
};

const getFormDefaultValue = (
  initialValue: CreateRecipeInput & { changeNote?: string | null }
): RecipeFormInput => ({
  changeNote: initialValue.changeNote ?? "",
  cookingTimeMinutes: initialValue.cookingTimeMinutes?.toString() ?? "",
  description: initialValue.description ?? "",
  ingredients: initialValue.ingredients.map((line) => ({
    displayName: line.displayName,
    note: line.note ?? "",
    quantityText: line.quantityText ?? "",
    quantityUnit: line.quantityUnit ?? "",
    quantityValue: line.quantityValue?.toString() ?? "",
  })),
  servingsText: initialValue.servingsText ?? "",
  source: {
    sourceName: initialValue.source.sourceName ?? "",
    sourceType: initialValue.source.sourceType,
    sourceUrl: initialValue.source.sourceUrl ?? "",
  },
  steps: initialValue.steps,
  title: initialValue.title,
});

const formClass = css({
  display: "grid",
  gap: "6",
  maxW: "3xl",
});
const fieldClass = css({
  display: "grid",
  gap: "1.5",
});
const inputClass = css({
  _focusVisible: {
    outline: "3px solid",
    outlineColor: "blue.600",
    outlineOffset: "2px",
  },
  borderColor: "gray.400",
  borderRadius: "md",
  borderWidth: "1px",
  minH: "12",
  px: "3",
  py: "2",
  width: "full",
});
const buttonClass = css({
  _disabled: {
    cursor: "not-allowed",
    opacity: "0.55",
  },
  _focusVisible: {
    outline: "3px solid",
    outlineColor: "blue.600",
    outlineOffset: "2px",
  },
  alignItems: "center",
  borderColor: "gray.700",
  borderRadius: "md",
  borderWidth: "1px",
  cursor: "pointer",
  display: "inline-flex",
  justifyContent: "center",
  minH: "12",
  px: "4",
  py: "2",
});
const errorClass = css({ color: "red.700", fontSize: "sm" });
const itemClass = css({
  borderColor: "gray.300",
  borderRadius: "lg",
  borderWidth: "1px",
  display: "grid",
  gap: "3",
  p: "4",
});

const FieldMessages = ({
  errors,
  id,
}: {
  errors?: string[] | undefined;
  id: string;
}) =>
  errors !== undefined && errors.length > 0 ? (
    <p className={errorClass} id={id} role="alert">
      {errors.join("、")}
    </p>
  ) : null;

const getSubmitLabel = (
  mode: RecipeFormProps["mode"],
  isPending: boolean
): string => {
  if (isPending) {
    return "保存中…";
  }
  if (mode === "create") {
    return "レシピを作成";
  }
  return "新しい版を保存";
};

export const RecipeForm = ({
  conflictRecipeId,
  initialValue = defaultRecipe,
  isPending,
  mode,
  onSubmit,
}: RecipeFormProps) => {
  const [form, fields] = useForm<RecipeFormInput, RecipeFormOutput>({
    defaultValue: getFormDefaultValue(initialValue),
    onSubmit(event, { submission }) {
      event.preventDefault();
      if (submission?.status !== "success") {
        return;
      }
      const { changeNote, ...recipe } = submission.value;
      onSubmit({ changeNote, recipe });
    },
    onValidate({ formData }) {
      return parseWithValibot(formData, { schema: recipeFormSchema });
    },
    shouldRevalidate: "onInput",
    shouldValidate: "onBlur",
  });
  const ingredientItems = fields.ingredients.getFieldList();
  const stepItems = fields.steps.getFieldList();
  const sourceFields = fields.source.getFieldset();

  return (
    <form {...getFormProps(form)} className={formClass} method="post">
      {conflictRecipeId !== undefined && conflictRecipeId.length > 0 ? (
        <div
          className={css({
            backgroundColor: "red.50",
            borderColor: "red.700",
            borderRadius: "md",
            borderWidth: "1px",
            p: "4",
          })}
          role="alert"
        >
          <p>編集中にレシピが更新された</p>
          <Link
            className={css({ textDecoration: "underline" })}
            params={{ recipeId: conflictRecipeId }}
            to="/recipes/$recipeId"
          >
            最新版を確認する
          </Link>
        </div>
      ) : null}

      <TextField
        {...getInputProps(fields.title, { type: "text" })}
        className={fieldClass}
        isInvalid={Boolean(fields.title.errors?.length)}
      >
        <Label>タイトル</Label>
        <Input className={inputClass} />
        <FieldMessages errors={fields.title.errors} id={fields.title.errorId} />
      </TextField>

      <TextField
        {...getTextareaProps(fields.description)}
        className={fieldClass}
      >
        <Label>説明</Label>
        <TextArea className={inputClass} rows={4} />
      </TextField>

      <div
        className={css({
          display: "grid",
          gap: "4",
          gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
        })}
      >
        <TextField
          {...getInputProps(fields.servingsText, { type: "text" })}
          className={fieldClass}
        >
          <Label>分量</Label>
          <Input className={inputClass} />
        </TextField>
        <TextField
          {...getInputProps(fields.cookingTimeMinutes, { type: "number" })}
          className={fieldClass}
        >
          <Label>調理時間（分）</Label>
          <Input className={inputClass} min={0} />
        </TextField>
      </div>

      <fieldset className={fieldClass}>
        <legend className={css({ fontSize: "lg", fontWeight: "semibold" })}>
          材料
        </legend>
        {ingredientItems.map((item, index) => {
          const ingredientFields = item.getFieldset();
          return (
            <div className={itemClass} key={item.key}>
              <TextField
                {...getInputProps(ingredientFields.displayName, {
                  type: "text",
                })}
                className={fieldClass}
              >
                <Label>材料名</Label>
                <Input className={inputClass} />
                <FieldMessages
                  errors={ingredientFields.displayName.errors}
                  id={ingredientFields.displayName.errorId}
                />
              </TextField>
              <div
                className={css({
                  display: "grid",
                  gap: "3",
                  gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
                })}
              >
                <TextField
                  {...getInputProps(ingredientFields.quantityValue, {
                    type: "number",
                  })}
                  className={fieldClass}
                >
                  <Label>数量</Label>
                  <Input className={inputClass} step="any" />
                </TextField>
                <TextField
                  {...getInputProps(ingredientFields.quantityUnit, {
                    type: "text",
                  })}
                  className={fieldClass}
                >
                  <Label>単位</Label>
                  <Input className={inputClass} />
                </TextField>
                <TextField
                  {...getInputProps(ingredientFields.quantityText, {
                    type: "text",
                  })}
                  className={fieldClass}
                >
                  <Label>分量の表記</Label>
                  <Input className={inputClass} />
                </TextField>
              </div>
              <TextField
                {...getInputProps(ingredientFields.note, { type: "text" })}
                className={fieldClass}
              >
                <Label>補足</Label>
                <Input className={inputClass} />
              </TextField>
              <Button
                className={buttonClass}
                onPress={() => {
                  form.remove({ index, name: fields.ingredients.name });
                }}
                type="button"
              >
                この材料を削除
              </Button>
            </div>
          );
        })}
        <Button
          className={buttonClass}
          onPress={() => {
            form.insert({
              defaultValue: {
                displayName: "",
                note: "",
                quantityText: "",
                quantityUnit: "",
                quantityValue: "",
              },
              name: fields.ingredients.name,
            });
          }}
          type="button"
        >
          材料を追加
        </Button>
      </fieldset>

      <fieldset className={fieldClass}>
        <legend className={css({ fontSize: "lg", fontWeight: "semibold" })}>
          手順
        </legend>
        {stepItems.map((item, index) => {
          const stepFields = item.getFieldset();
          return (
            <div className={itemClass} key={item.key}>
              <TextField
                {...getTextareaProps(stepFields.body)}
                className={fieldClass}
              >
                <Label>{`手順 ${index + 1}`}</Label>
                <TextArea className={inputClass} rows={3} />
                <FieldMessages
                  errors={stepFields.body.errors}
                  id={stepFields.body.errorId}
                />
              </TextField>
              <Button
                className={buttonClass}
                onPress={() => {
                  form.remove({ index, name: fields.steps.name });
                }}
                type="button"
              >
                この手順を削除
              </Button>
            </div>
          );
        })}
        <Button
          className={buttonClass}
          onPress={() => {
            form.insert({
              defaultValue: { body: "" },
              name: fields.steps.name,
            });
          }}
          type="button"
        >
          手順を追加
        </Button>
      </fieldset>

      {mode === "create" ? (
        <fieldset className={fieldClass}>
          <legend className={css({ fontSize: "lg", fontWeight: "semibold" })}>
            出典
          </legend>
          <label htmlFor={sourceFields.sourceType.id}>種類</label>
          <select
            {...getInputProps(sourceFields.sourceType, { type: "text" })}
            className={inputClass}
          >
            <option value="original">オリジナル</option>
            <option value="website">ウェブサイト</option>
            <option value="book">本</option>
            <option value="other">その他</option>
          </select>
          <TextField
            {...getInputProps(sourceFields.sourceName, { type: "text" })}
            className={fieldClass}
          >
            <Label>出典名</Label>
            <Input className={inputClass} />
          </TextField>
          <TextField
            {...getInputProps(sourceFields.sourceUrl, { type: "url" })}
            className={fieldClass}
          >
            <Label>出典URL</Label>
            <Input className={inputClass} />
          </TextField>
        </fieldset>
      ) : (
        <>
          <input
            {...getInputProps(sourceFields.sourceType, { type: "hidden" })}
          />
          <input
            {...getInputProps(sourceFields.sourceName, { type: "hidden" })}
          />
          <input
            {...getInputProps(sourceFields.sourceUrl, { type: "hidden" })}
          />
          <TextField
            {...getTextareaProps(fields.changeNote)}
            className={fieldClass}
          >
            <Label>変更メモ</Label>
            <TextArea className={inputClass} rows={3} />
          </TextField>
        </>
      )}

      {mode === "create" ? (
        <input {...getInputProps(fields.changeNote, { type: "hidden" })} />
      ) : null}
      <button className={buttonClass} disabled={isPending} type="submit">
        {getSubmitLabel(mode, isPending)}
      </button>
    </form>
  );
};
