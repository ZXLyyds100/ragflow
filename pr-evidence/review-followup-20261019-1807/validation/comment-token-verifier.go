// Verify syntax and non-comment token equivalence for an explicitly scoped diff.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/scanner"
	"go/token"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type lexicalToken struct {
	Kind    token.Token
	Literal string
}

func tokens(name string, source []byte) ([]lexicalToken, error) {
	if _, err := parser.ParseFile(token.NewFileSet(), name, source, parser.ParseComments); err != nil {
		return nil, err
	}
	set := token.NewFileSet()
	file := set.AddFile(name, set.Base(), len(source))
	var lexer scanner.Scanner
	lexer.Init(file, source, nil, 0)
	var result []lexicalToken
	for {
		_, kind, literal := lexer.Scan()
		result = append(result, lexicalToken{kind, literal})
		if kind == token.EOF {
			break
		}
	}
	return result, nil
}

func git(repo string, args ...string) []byte {
	command := exec.Command("git", append([]string{"-C", repo}, args...)...)
	output, err := command.Output()
	if err != nil {
		panic(err)
	}
	return output
}

func main() {
	if len(os.Args) != 3 {
		panic("usage: verify-go-comment-only REPOSITORY BASELINE")
	}
	repo, baseline := os.Args[1], os.Args[2]
	rawPaths := git(repo, "diff", "--name-only", "-z", baseline)
	var files []map[string]any
	for _, path := range strings.Split(string(rawPaths), "\x00") {
		if path == "" {
			continue
		}
		if !strings.HasSuffix(path, ".go") {
			panic("unexpected non-Go change: " + path)
		}
		before := git(repo, "show", baseline+":"+path)
		after, err := os.ReadFile(filepath.Join(repo, path))
		if err != nil {
			panic(err)
		}
		beforeTokens, err := tokens(path, before)
		if err != nil {
			panic(err)
		}
		afterTokens, err := tokens(path, after)
		if err != nil {
			panic(err)
		}
		left, _ := json.Marshal(beforeTokens)
		right, _ := json.Marshal(afterTokens)
		if !bytes.Equal(left, right) {
			panic("executable tokens differ: " + path)
		}
		parsed, err := parser.ParseFile(token.NewFileSet(), path, after, parser.ParseComments)
		if err != nil {
			panic(err)
		}
		var documented, undocumented []string
		for _, declaration := range parsed.Decls {
			function, ok := declaration.(*ast.FuncDecl)
			if !ok {
				continue
			}
			if function.Doc == nil {
				undocumented = append(undocumented, function.Name.Name)
			} else {
				documented = append(documented, function.Name.Name)
			}
		}
		files = append(files, map[string]any{
			"path": path, "syntax_valid": true, "non_comment_tokens_equal": true,
			"named_functions_with_doc": documented, "named_functions_without_doc": undocumented,
		})
	}
	if len(files) == 0 {
		panic("no changed Go files")
	}
	result := map[string]any{
		"baseline": baseline, "files": files, "comment_only_verified": true,
		"boundary": "Standard Go parser/scanner equivalence, not a CodeRabbit coverage result or fresh runtime test",
	}
	output, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		panic(err)
	}
	fmt.Println(string(output))
}
